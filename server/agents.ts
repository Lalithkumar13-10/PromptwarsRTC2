import crypto from 'crypto';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { db } from './db.ts';
import type {
  AssessmentQuestion,
  CareerRequiredSkill,
  LearnerProfile,
  LearningResource,
  QuestionFeedback,
  Skill,
  SkillAnalysisReport,
  SkillGapItem,
  SkillLevel,
} from '../src/types.ts';

const PRIMARY_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-4-hydrogen';
const MODEL_PRIORITY = [PRIMARY_MODEL, FALLBACK_MODEL] as const;

// Track temporary cooldowns per model when rate limits / daily quotas are hit
const modelCooldownUntil = new Map<string, number>();

export class GeminiServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = 'GEMINI_ERROR') {
    super(message);
    this.name = 'GeminiServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiServiceError(
      'Gemini API key is not configured. Please verify your API key in Settings > Secrets.',
      500,
      'API_KEY_MISSING'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseRetryDelayMs(text: string): number | null {
  const secMatch = text.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i);
  if (secMatch) {
    return Math.ceil(Number(secMatch[1]) * 1000);
  }
  const humanMatch = text.match(/retry in\s+(?:(\d+)h)?(?:(\d+)m)?(\d+(?:\.\d+)?)s/i);
  if (humanMatch) {
    const h = Number(humanMatch[1] || 0);
    const m = Number(humanMatch[2] || 0);
    const s = Number(humanMatch[3] || 0);
    return Math.ceil((h * 3600 + m * 60 + s) * 1000);
  }
  return null;
}

function formatDurationShort(ms: number): string {
  const totalSec = Math.max(1, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function extractGeminiErrorDetails(err: unknown): {
  statusCode: number;
  statusText: string;
  rawMessage: string;
  isQuotaError: boolean;
  isDailyQuota: boolean;
  retryDelayMs: number | null;
} {
  const errObj = err as { status?: number; statusCode?: number; message?: string } | undefined;
  const rawMessage = err instanceof Error ? err.message : String(err ?? 'Unknown Gemini API error');

  let parsedCode = Number(errObj?.statusCode || errObj?.status || 0);
  let parsedStatus = '';
  let innerMessage = rawMessage;

  const jsonStart = rawMessage.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const jsonPart = JSON.parse(rawMessage.slice(jsonStart)) as {
        error?: { code?: number; status?: string; message?: string };
      };
      if (jsonPart?.error) {
        parsedCode = Number(jsonPart.error.code || parsedCode || 0);
        parsedStatus = String(jsonPart.error.status || '');
        innerMessage = String(jsonPart.error.message || rawMessage);
      }
    } catch {
      // ignore non-JSON tail
    }
  }

  const combined = `${parsedStatus} ${rawMessage} ${innerMessage}`;
  const isQuotaError =
    parsedCode === 429 ||
    /RESOURCE_EXHAUSTED|quota|rate[- ]limit/i.test(combined);
  const isDailyQuota = /PerDay|requests per day/i.test(combined);
  const retryDelayMs = parseRetryDelayMs(combined);

  return {
    statusCode: parsedCode || (isQuotaError ? 429 : 500),
    statusText: parsedStatus,
    rawMessage: innerMessage,
    isQuotaError,
    isDailyQuota,
    retryDelayMs,
  };
}

export function normalizeGeminiError(err: unknown): GeminiServiceError {
  if (err instanceof GeminiServiceError) return err;

  const details = extractGeminiErrorDetails(err);
  if (details.isQuotaError) {
    const retryNote = details.retryDelayMs ? ` Please retry in ~${formatDurationShort(details.retryDelayMs)}.` : ' Please retry shortly.';
    return new GeminiServiceError(
      `AI service quota or rate limit reached across available models.${retryNote} You can also switch to a billing-enabled API key in Settings > Secrets to raise your daily quota.`,
      429,
      'RESOURCE_EXHAUSTED'
    );
  }
  if (details.statusCode === 403 || /PERMISSION_DENIED/i.test(details.statusText + details.rawMessage)) {
    return new GeminiServiceError(
      'Gemini API permission denied. Please verify your API key in Settings > Secrets.',
      403,
      'PERMISSION_DENIED'
    );
  }
  if (details.statusCode === 400 && /API_KEY_INVALID|API key not valid/i.test(details.rawMessage)) {
    return new GeminiServiceError(
      'Gemini API key is invalid. Please update your API key in Settings > Secrets.',
      400,
      'API_KEY_INVALID'
    );
  }
  if (details.statusCode === 404 || /NOT_FOUND/i.test(details.statusText)) {
    return new GeminiServiceError(
      'Requested Gemini model is currently unavailable.',
      404,
      'NOT_FOUND'
    );
  }
  return new GeminiServiceError(
    details.rawMessage.slice(0, 300) || 'Failed to generate AI response.',
    details.statusCode >= 400 ? details.statusCode : 500,
    details.statusText || 'GEMINI_ERROR'
  );
}

type GenerateConfig = {
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: unknown;
};

async function generateContentWithFallback(
  contents: string,
  config: GenerateConfig = {}
): Promise<string> {
  const ai = getAI();
  const now = Date.now();

  // Order models: active (non-cooled-down) models first, then cooled-down models as a last resort
  const activeModels = MODEL_PRIORITY.filter((m) => (modelCooldownUntil.get(m) ?? 0) <= now);
  const candidateModels = activeModels.length > 0 ? activeModels : [...MODEL_PRIORITY];

  let lastErr: unknown;

  for (const model of candidateModels) {
    // Allow 1 quick retry only for transient 5xx/network errors on the same model
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const modelConfig: Record<string, unknown> = { ...config };
        // gemini-4-hydrogen defaults to HIGH thinking; use LOW for fast structured tasks.
        // gemini-3.1-flash-lite defaults to MINIMAL and does not need thinkingConfig set.
        if (model === 'gemini-4-hydrogen') {
          modelConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        const response = await ai.models.generateContent({
          model,
          contents,
          config: modelConfig,
        });

        modelCooldownUntil.delete(model);
        return (response.text ?? '').trim();
      } catch (err) {
        lastErr = err;
        const details = extractGeminiErrorDetails(err);

        if (details.isQuotaError) {
          // Record cooldown for this model and immediately fail over to the next model
          const cooldownMs = details.isDailyQuota
            ? Math.min(details.retryDelayMs ?? 30 * 60 * 1000, 60 * 60 * 1000)
            : Math.min(details.retryDelayMs ?? 60 * 1000, 2 * 60 * 1000);
          modelCooldownUntil.set(model, Date.now() + cooldownMs);
          break;
        }

        const isNonRetryableClientError =
          details.statusCode === 400 ||
          details.statusCode === 401 ||
          details.statusCode === 403 ||
          details.statusCode === 404;

        if (isNonRetryableClientError) {
          if (details.statusCode === 404) {
            break; // try alternate model
          }
          throw normalizeGeminiError(err);
        }

        if (attempt === 0) {
          await new Promise((res) => setTimeout(res, 600));
        }
      }
    }
  }

  throw normalizeGeminiError(lastErr);
}

function toSkillLevel(score: number): SkillLevel {
  if (score >= 75) return 'Advanced';
  if (score >= 45) return 'Intermediate';
  return 'Beginner';
}

// ============================================================================
// AGENT 1: SKILL ASSESSMENT AGENT
// ============================================================================

export async function runSkillAssessmentAgentProfileAnalysis(params: {
  name: string;
  education: string;
  experience: string;
  currentSkillLevel: SkillLevel;
  enteredSkills: { name: string; category: 'Technical' | 'Soft'; selfRating?: number }[];
  certifications: string[];
  projects: { title: string; description: string; technologies: string[] }[];
  targetCareer: string;
}) {
  const prompt = `
You are Agent 1 (Skill Assessment Agent) in an enterprise personalized learning platform.
Analyze the learner's background and assign calibrated proficiency scores (0-100) for their existing skills, plus any foundational skills clearly evidenced by their projects or certifications.

Learner: ${params.name}
Education: ${params.education}
Experience: ${params.experience}
Self-declared overall level: ${params.currentSkillLevel}
Target Career: ${params.targetCareer}
Entered Skills: ${JSON.stringify(params.enteredSkills)}
Certifications: ${JSON.stringify(params.certifications)}
Completed Projects: ${JSON.stringify(params.projects)}

Return a calibrated assessment of each skill (0-100), classify each into Beginner (0-44), Intermediate (45-74), or Advanced (75-100), identify strengths and weaknesses, and produce a concise analytical summary.
`;

  const rawText = await generateContentWithFallback(prompt, {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        evaluatedSkills: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING, description: 'Technical or Soft' },
              proficiency: { type: Type.INTEGER, description: '0 to 100' },
              level: { type: Type.STRING, description: 'Beginner, Intermediate, or Advanced' },
              isStrength: { type: Type.BOOLEAN },
              isWeakness: { type: Type.BOOLEAN },
            },
            required: ['name', 'category', 'proficiency', 'level', 'isStrength', 'isWeakness'],
          },
        },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        reportSummary: { type: Type.STRING },
      },
      required: ['evaluatedSkills', 'strengths', 'weaknesses', 'reportSummary'],
    },
  });

  return JSON.parse(rawText || '{}') as {
    evaluatedSkills: {
      name: string;
      category: 'Technical' | 'Soft';
      proficiency: number;
      level: SkillLevel;
      isStrength: boolean;
      isWeakness: boolean;
    }[];
    strengths: string[];
    weaknesses: string[];
    reportSummary: string;
  };
}

export async function runSkillAssessmentAgentGenerateQuiz(params: {
  skillName: string;
  difficulty: SkillLevel;
  targetCareer: string;
  weakTopics?: string[];
}): Promise<AssessmentQuestion[]> {
  const prompt = `
You are Agent 1 (Skill Assessment Agent).
Generate a 5-question dynamic skill assessment for:
- Skill: ${params.skillName}
- Difficulty: ${params.difficulty}
- Learner Target Career: ${params.targetCareer}
${params.weakTopics?.length ? `- Focus Weak Topics: ${params.weakTopics.join(', ')}` : ''}

Include exactly:
- 4 multiple-choice questions (type: "mcq") with 4 concrete, unambiguous options and correctOptionIndex (0-3). Include short realistic codeSnippet where appropriate for programming/technical skills.
- 1 practical conceptual or coding short-answer question (type: "descriptive") that tests applied reasoning.

Do not invent trick questions. Provide a clear explanation for every question.
`;

  const rawText = await generateContentWithFallback(prompt, {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, description: 'mcq or descriptive' },
              prompt: { type: Type.STRING },
              codeSnippet: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctOptionIndex: { type: Type.INTEGER },
              topic: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ['id', 'type', 'prompt', 'topic', 'explanation'],
          },
        },
      },
      required: ['questions'],
    },
  });

  const parsed = JSON.parse(rawText || '{"questions":[]}') as {
    questions: AssessmentQuestion[];
  };
  return (parsed.questions || []).map((q, idx) => ({
    ...q,
    id: q.id || `q-${idx + 1}`,
    type: q.type === 'descriptive' ? 'descriptive' : 'mcq',
    options: q.type === 'descriptive' ? undefined : q.options?.slice(0, 4) || ['Option A', 'Option B', 'Option C', 'Option D'],
    correctOptionIndex: q.type === 'descriptive' ? undefined : Number(q.correctOptionIndex ?? 0),
  }));
}

export async function runSkillAssessmentAgentEvaluateQuiz(params: {
  skillName: string;
  difficulty: SkillLevel;
  questions: AssessmentQuestion[];
  answers: Record<string, string | number>;
}) {
  const objectiveFeedback: QuestionFeedback[] = [];
  const descriptiveItems: { q: AssessmentQuestion; answer: string }[] = [];

  for (const q of params.questions) {
    const rawAns = params.answers[q.id];
    if (q.type === 'mcq') {
      const selectedIdx = typeof rawAns === 'number' ? rawAns : Number(rawAns);
      const isCorrect = selectedIdx === q.correctOptionIndex;
      objectiveFeedback.push({
        questionId: q.id,
        topic: q.topic,
        isCorrect,
        score: isCorrect ? 100 : 0,
        feedback: isCorrect
          ? `Correct. ${q.explanation || ''}`
          : `Selected "${q.options?.[selectedIdx] ?? 'No answer'}". ${q.explanation || ''}`,
        correctAnswerSummary: q.options?.[q.correctOptionIndex ?? 0] ?? '',
      });
    } else {
      descriptiveItems.push({ q, answer: String(rawAns ?? '').trim() });
    }
  }

  let descriptiveFeedback: QuestionFeedback[] = [];
  let weakTopics: string[] = [];
  let strongTopics: string[] = [];
  let aiSummary = '';

  const hasWrittenDescriptive = descriptiveItems.some((d) => d.answer.length > 0);

  if (descriptiveItems.length === 0 || !hasWrittenDescriptive) {
    descriptiveFeedback = descriptiveItems.map((d) => ({
      questionId: d.q.id,
      topic: d.q.topic,
      isCorrect: false,
      score: 0,
      feedback: `No response submitted. ${d.q.explanation || ''}`.trim(),
      correctAnswerSummary: d.q.explanation || 'Refer to concept explanation.',
    }));
    const combined = [...objectiveFeedback, ...descriptiveFeedback];
    weakTopics = Array.from(new Set(combined.filter((f) => !f.isCorrect).map((f) => f.topic)));
    strongTopics = Array.from(new Set(combined.filter((f) => f.isCorrect).map((f) => f.topic)));
    const correctCountDeterministic = combined.filter((f) => f.isCorrect).length;
    aiSummary = `Completed ${params.difficulty} ${params.skillName} assessment (${correctCountDeterministic}/${params.questions.length} correct). ${
      weakTopics.length ? `Review ${weakTopics.join(', ')} for stronger mastery.` : 'Solid performance across all evaluated topics.'
    }`;
  } else {
    const evalPrompt = `
You are Agent 1 (Skill Assessment Agent).
Evaluate the learner's descriptive answers for the ${params.difficulty} ${params.skillName} assessment, and summarize overall performance including objective MCQ results.

Objective results so far:
${JSON.stringify(objectiveFeedback.map((f) => ({ topic: f.topic, isCorrect: f.isCorrect })))}

Descriptive questions & learner answers to grade (score 0-100):
${JSON.stringify(
      descriptiveItems.map((d) => ({
        questionId: d.q.id,
        topic: d.q.topic,
        prompt: d.q.prompt,
        referenceExplanation: d.q.explanation,
        learnerAnswer: d.answer || '(No response provided)',
      }))
    )}

Return precise grading for each descriptive question (isCorrect true if score >= 60), plus weakTopics, strongTopics, and a 2-sentence executive aiEvaluationSummary.
`;

    const rawText = await generateContentWithFallback(evalPrompt, {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          descriptiveGrades: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                questionId: { type: Type.STRING },
                topic: { type: Type.STRING },
                score: { type: Type.INTEGER },
                isCorrect: { type: Type.BOOLEAN },
                feedback: { type: Type.STRING },
                correctAnswerSummary: { type: Type.STRING },
              },
              required: ['questionId', 'topic', 'score', 'isCorrect', 'feedback', 'correctAnswerSummary'],
            },
          },
          weakTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
          strongTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
          aiEvaluationSummary: { type: Type.STRING },
        },
        required: ['descriptiveGrades', 'weakTopics', 'strongTopics', 'aiEvaluationSummary'],
      },
    });

    const graded = JSON.parse(rawText || '{}') as {
      descriptiveGrades: QuestionFeedback[];
      weakTopics: string[];
      strongTopics: string[];
      aiEvaluationSummary: string;
    };

    descriptiveFeedback = graded.descriptiveGrades || [];
    weakTopics = graded.weakTopics || [];
    strongTopics = graded.strongTopics || [];
    aiSummary = graded.aiEvaluationSummary || 'Assessment evaluated.';
  }

  const allFeedback = [...objectiveFeedback, ...descriptiveFeedback];
  const totalCount = params.questions.length || 1;
  const totalScore = Math.round(allFeedback.reduce((acc, item) => acc + item.score, 0) / totalCount);
  const correctCount = allFeedback.filter((f) => f.isCorrect).length;

  return {
    score: totalScore,
    correctCount,
    totalCount,
    feedback: allFeedback,
    weakTopics,
    strongTopics,
    aiEvaluationSummary: aiSummary,
  };
}

// ============================================================================
// AGENT 2: CAREER INTELLIGENCE AGENT
// ============================================================================

export async function runCareerIntelligenceAgent(params: {
  targetCareer: string;
  currentSkills: Skill[];
}): Promise<{
  requiredMatrix: CareerRequiredSkill[];
  gapReport: SkillAnalysisReport;
  agentNote: string;
}> {
  // Check if role exists in DB catalog first; if not, ask Gemini to build a matrix and store it!
  const existingRole = db
    .prepare('SELECT * FROM career_roles WHERE LOWER(title) = LOWER(?)')
    .get(params.targetCareer) as
    | {
        id: string;
        title: string;
        domain: string;
        description: string;
        required_skills_json: string;
        avg_salary_range: string;
        demand_level: string;
      }
    | undefined;

  let requiredMatrix: CareerRequiredSkill[] = [];

  if (existingRole) {
    requiredMatrix = JSON.parse(existingRole.required_skills_json) as CareerRequiredSkill[];
  } else {
    const prompt = `
You are Agent 2 (Career Intelligence Agent).
Build an industry-standard required skill matrix for the target career role: "${params.targetCareer}".
Include 6 to 7 essential Technical and Soft skills with target proficiency levels (65 to 95), priorities ("Critical", "High", or "Medium"), and brief role-specific descriptions.
Also provide domain, 1-sentence role description, avgSalaryRange, and demandLevel.
`;

    const rawText = await generateContentWithFallback(prompt, {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          domain: { type: Type.STRING },
          description: { type: Type.STRING },
          avgSalaryRange: { type: Type.STRING },
          demandLevel: { type: Type.STRING },
          requiredSkills: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING, description: 'Technical or Soft' },
                requiredLevel: { type: Type.INTEGER },
                priority: { type: Type.STRING, description: 'Critical, High, or Medium' },
                description: { type: Type.STRING },
              },
              required: ['name', 'category', 'requiredLevel', 'priority', 'description'],
            },
          },
        },
        required: ['domain', 'description', 'avgSalaryRange', 'demandLevel', 'requiredSkills'],
      },
    });

    const generatedRole = JSON.parse(rawText || '{}') as {
      domain: string;
      description: string;
      avgSalaryRange: string;
      demandLevel: string;
      requiredSkills: CareerRequiredSkill[];
    };

    requiredMatrix = generatedRole.requiredSkills || [];
    db.prepare(`
      INSERT OR IGNORE INTO career_roles (id, title, domain, description, required_skills_json, avg_salary_range, demand_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `role-${crypto.randomUUID().slice(0, 8)}`,
      params.targetCareer,
      generatedRole.domain || 'Technology',
      generatedRole.description || `Career track for ${params.targetCareer}`,
      JSON.stringify(requiredMatrix),
      generatedRole.avgSalaryRange || '$110,000 – $170,000',
      generatedRole.demandLevel || 'High'
    );
  }

  // Deterministic + semantic comparison of learner skills against required matrix
  const gaps: SkillGapItem[] = requiredMatrix.map((req) => {
    const match = params.currentSkills.find(
      (s) =>
        s.name.toLowerCase() === req.name.toLowerCase() ||
        s.name.toLowerCase().includes(req.name.toLowerCase()) ||
        req.name.toLowerCase().includes(s.name.toLowerCase())
    );
    const currentLevel = match ? match.proficiency : 0;
    const gap = Math.max(0, req.requiredLevel - currentLevel);

    let status: SkillGapItem['status'] = 'On Track';
    if (gap === 0 || currentLevel >= req.requiredLevel) {
      status = 'Mastered';
    } else if (gap >= 35 || (req.priority === 'Critical' && gap >= 20)) {
      status = 'Critical Gap';
    } else if (gap >= 15) {
      status = 'Needs Focus';
    }

    return {
      skillName: req.name,
      category: req.category,
      currentLevel,
      requiredLevel: req.requiredLevel,
      gap,
      priority: req.priority,
      status,
      description: req.description,
    };
  });

  // Weighted readiness calculation
  const weights = { Critical: 3, High: 2, Medium: 1 };
  let weightedSum = 0;
  let totalWeight = 0;
  for (const g of gaps) {
    const w = weights[g.priority] || 1;
    const ratio = Math.min(1, g.currentLevel / Math.max(1, g.requiredLevel));
    weightedSum += ratio * w;
    totalWeight += w;
  }
  const readinessScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;

  const strengths = gaps.filter((g) => g.gap <= 10).map((g) => g.skillName);
  const weaknesses = gaps.filter((g) => g.gap >= 25).map((g) => g.skillName);

  const highPriorityGaps = gaps
    .filter((g) => g.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3)
    .map((g) => `${g.skillName} (gap ${g.gap} pts)`);

  const agentNote = `Readiness for ${params.targetCareer}: ${readinessScore}%. ${
    highPriorityGaps.length > 0
      ? `Priority gaps identified: ${highPriorityGaps.join(', ')}.`
      : 'All core career competencies meet target thresholds.'
  }`;

  const gapReport: SkillAnalysisReport = {
    targetCareer: params.targetCareer,
    readinessScore,
    totalAssessed: params.currentSkills.length,
    skillsMastered: gaps.filter((g) => g.status === 'Mastered').length,
    skillsNeedingImprovement: gaps.filter((g) => g.gap > 10).length,
    strengths,
    weaknesses,
    gaps,
    executiveSummary: agentNote,
  };

  return { requiredMatrix, gapReport, agentNote };
}

// ============================================================================
// AGENT 3: LEARNING PATH RECOMMENDATION AGENT
// ============================================================================

export async function runLearningPathAgent(params: {
  targetCareer: string;
  learningStyle: string;
  weeklyHours: number;
  gapReport: SkillAnalysisReport;
  preservedCompletedSkills?: string[];
  remedialFocus?: { skillName: string; weakTopics: string[] };
}): Promise<{
  strategySummary: string;
  roadmapAgentNote: string;
  modules: Omit<LearningResource, 'id' | 'learningPathId' | 'userId' | 'status' | 'completedAt'>[];
}> {
  const prompt = `
You are Agent 3 (Learning Path Recommendation Agent).
Generate a personalized, sequential learning roadmap for a learner targeting "${params.targetCareer}".
Learner preferences:
- Learning Style: ${params.learningStyle}
- Weekly Availability: ${params.weeklyHours} hours/week
- Skill Gaps: ${JSON.stringify(params.gapReport.gaps)}
${
  params.preservedCompletedSkills?.length
    ? `- Skills already mastered/completed in prior path (skip redundant beginner modules for these): ${params.preservedCompletedSkills.join(', ')}`
    : ''
}
${
  params.remedialFocus
    ? `- URGENT REMEDIAL ADAPTATION: Learner struggled on "${params.remedialFocus.skillName}" (weak topics: ${params.remedialFocus.weakTopics.join(', ')}). Include a clear, simpler foundational tutorial & practical drill early in the roadmap.`
    : ''
}

Requirements:
1. Create 6 structured modules organized progressively across Beginner, Intermediate, and Advanced phases.
2. Prioritize the largest and most critical skill gaps first.
3. CRITICAL URL RULE: Only use REAL, well-known, verified official documentation or major open learning URLs (e.g., https://docs.python.org/3/tutorial/, https://pytorch.org/tutorials/, https://scikit-learn.org/stable/user_guide.html, https://react.dev/learn, https://www.typescriptlang.org/docs/, https://www.kaggle.com/learn, https://developer.mozilla.org/en-US/docs/Web, https://fastapi.tiangolo.com/tutorial/, https://kubernetes.io/docs/tutorials/, https://docs.docker.com/get-started/, https://www.freecodecamp.org/learn/, https://www.postgresql.org/docs/current/tutorial.html, https://ai.google.dev/gemini-api/docs, https://roadmap.sh). NEVER invent fake URLs or synthetic course links.
4. Every module must include: phase (Beginner|Intermediate|Advanced), skillName, title, resourceType (Course|Documentation|Tutorial|Project), url, provider, learningObjectives (2-3 items), practicalExercise (concrete hands-on task), expectedOutcome, estimatedHours (number), difficulty (Beginner|Intermediate|Advanced), and isRemedial (boolean).
`;

  const rawText = await generateContentWithFallback(prompt, {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        strategySummary: { type: Type.STRING },
        roadmapAgentNote: { type: Type.STRING },
        modules: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              phase: { type: Type.STRING, description: 'Beginner, Intermediate, or Advanced' },
              skillName: { type: Type.STRING },
              title: { type: Type.STRING },
              resourceType: { type: Type.STRING, description: 'Course, Documentation, Tutorial, or Project' },
              url: { type: Type.STRING },
              provider: { type: Type.STRING },
              learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
              practicalExercise: { type: Type.STRING },
              expectedOutcome: { type: Type.STRING },
              estimatedHours: { type: Type.NUMBER },
              difficulty: { type: Type.STRING, description: 'Beginner, Intermediate, or Advanced' },
              isRemedial: { type: Type.BOOLEAN },
            },
            required: [
              'phase',
              'skillName',
              'title',
              'resourceType',
              'url',
              'provider',
              'learningObjectives',
              'practicalExercise',
              'expectedOutcome',
              'estimatedHours',
              'difficulty',
              'isRemedial',
            ],
          },
        },
      },
      required: ['strategySummary', 'roadmapAgentNote', 'modules'],
    },
  });

  const parsed = JSON.parse(rawText || '{}') as {
    strategySummary: string;
    roadmapAgentNote: string;
    modules: {
      phase: SkillLevel;
      skillName: string;
      title: string;
      resourceType: 'Course' | 'Documentation' | 'Tutorial' | 'Project';
      url: string;
      provider: string;
      learningObjectives: string[];
      practicalExercise: string;
      expectedOutcome: string;
      estimatedHours: number;
      difficulty: SkillLevel;
      isRemedial: boolean;
    }[];
  };

  const modules = (parsed.modules || []).map((m, idx) => ({
    phase: (['Beginner', 'Intermediate', 'Advanced'].includes(m.phase) ? m.phase : 'Intermediate') as SkillLevel,
    orderIndex: idx + 1,
    skillName: m.skillName,
    title: m.title,
    resourceType: (['Course', 'Documentation', 'Tutorial', 'Project'].includes(m.resourceType)
      ? m.resourceType
      : 'Tutorial') as 'Course' | 'Documentation' | 'Tutorial' | 'Project',
    url: m.url?.startsWith('http') ? m.url : 'https://roadmap.sh',
    provider: m.provider || 'Official Documentation',
    learningObjectives: m.learningObjectives || [],
    practicalExercise: m.practicalExercise,
    expectedOutcome: m.expectedOutcome,
    estimatedHours: Math.max(2, Number(m.estimatedHours) || 6),
    difficulty: (['Beginner', 'Intermediate', 'Advanced'].includes(m.difficulty) ? m.difficulty : 'Intermediate') as SkillLevel,
    isRemedial: Boolean(m.isRemedial),
  }));

  return {
    strategySummary: parsed.strategySummary || `Adaptive roadmap tailored for ${params.targetCareer}.`,
    roadmapAgentNote: parsed.roadmapAgentNote || 'Generated phased curriculum ordered by highest skill gaps.',
    modules,
  };
}

// ============================================================================
// AGENT 4: PROGRESS EVALUATION AGENT
// ============================================================================

export async function runProgressEvaluationAgent(params: {
  skillName: string;
  previousProficiency: number;
  assessmentScore: number;
  difficulty: SkillLevel;
  weakTopics: string[];
  strongTopics: string[];
}) {
  const prompt = `
You are Agent 4 (Progress Evaluation Agent).
Analyze the learner's assessment performance:
- Skill: ${params.skillName} (${params.difficulty} level)
- Previous Proficiency: ${params.previousProficiency}/100
- New Assessment Score: ${params.assessmentScore}/100
- Weak Topics: ${JSON.stringify(params.weakTopics)}
- Strong Topics: ${JSON.stringify(params.strongTopics)}

Decide:
1. performanceBand: "poor" (< 55), "steady" (55-79), or "strong" (>= 80).
2. newProficiency: calibrated integer 0-100 based on evidence (increase meaningfully if strong, calibrate realistically if poor).
3. adaptationAction: "insert_remedial" | "maintain_pace" | "accelerate_advanced".
4. evaluationNote: clear 1-2 sentence synthesis of progress compared to previous level.
5. remedialModuleSuggestion (only needed if poor): concrete simpler tutorial title, real official docs URL, and practical drill targeting weakTopics.
6. advancedProjectSuggestion (only needed if strong): concrete advanced practical project title and exercise.
`;

  const rawText = await generateContentWithFallback(prompt, {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        performanceBand: { type: Type.STRING, description: 'poor, steady, or strong' },
        newProficiency: { type: Type.INTEGER },
        adaptationAction: { type: Type.STRING, description: 'insert_remedial, maintain_pace, or accelerate_advanced' },
        evaluationNote: { type: Type.STRING },
        remedialModuleSuggestion: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            url: { type: Type.STRING },
            provider: { type: Type.STRING },
            practicalExercise: { type: Type.STRING },
            estimatedHours: { type: Type.NUMBER },
          },
        },
        advancedProjectSuggestion: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            url: { type: Type.STRING },
            provider: { type: Type.STRING },
            practicalExercise: { type: Type.STRING },
            estimatedHours: { type: Type.NUMBER },
          },
        },
      },
      required: ['performanceBand', 'newProficiency', 'adaptationAction', 'evaluationNote'],
    },
  });

  return JSON.parse(rawText || '{}') as {
    performanceBand: 'poor' | 'steady' | 'strong';
    newProficiency: number;
    adaptationAction: 'insert_remedial' | 'maintain_pace' | 'accelerate_advanced';
    evaluationNote: string;
    remedialModuleSuggestion?: {
      title: string;
      url: string;
      provider: string;
      practicalExercise: string;
      estimatedHours: number;
    };
    advancedProjectSuggestion?: {
      title: string;
      url: string;
      provider: string;
      practicalExercise: string;
      estimatedHours: number;
    };
  };
}

// ============================================================================
// AGENT 5: AI MENTOR AGENT
// ============================================================================

export async function runAIMentorAgent(params: {
  userName: string;
  profile: LearnerProfile;
  skills: Skill[];
  roadmapModules: LearningResource[];
  recentResults: { skillName: string; score: number; weakTopics: string[] }[];
  conversationHistory: { role: 'user' | 'assistant'; content: string }[];
  userMessage: string;
}) {
  const completedMods = params.roadmapModules.filter((m) => m.status === 'completed').map((m) => m.title);
  const activeMods = params.roadmapModules
    .filter((m) => m.status === 'in_progress' || m.status === 'not_started')
    .slice(0, 3)
    .map((m) => `${m.title} (${m.skillName}, ${m.phase})`);

  const systemInstruction = `
You are Agent 5 (AI Mentor Agent) on SkillPath AI.
You are mentoring ${params.userName} directly. Always ground your advice in their live profile, skills, gaps, assessments, and active roadmap—never respond like a generic chatbot.

Learner Context:
- Target Career: ${params.profile.targetCareer} (Current Readiness: ${params.profile.careerReadinessScore}%)
- Learning Style: ${params.profile.learningStyle} (${params.profile.weeklyHours} hrs/week)
- Education & Experience: ${params.profile.education} | ${params.profile.experience}
- Assessed Skills: ${params.skills.map((s) => `${s.name}: ${s.proficiency}% (${s.level})`).join(', ')}
- Completed Modules: ${completedMods.length ? completedMods.join('; ') : 'None yet'}
- Next Active Modules: ${activeMods.length ? activeMods.join('; ') : 'None queued'}
- Recent Assessments: ${params.recentResults.length ? params.recentResults.map((r) => `${r.skillName}: ${r.score}% (weak: ${r.weakTopics.join(', ') || 'none'})`).join(' | ') : 'None yet'}

Guidelines:
- Give clear, structured, motivating, technically accurate explanations.
- When explaining difficult concepts, break them down step by step with concrete examples.
- Recommend specific next actions from their actual roadmap or suggest alternative study approaches if they are stuck.
- Provide 2-3 short follow-up prompt suggestions in suggestedActions.
`;

  const historyText = params.conversationHistory
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'Learner' : 'Mentor'}: ${m.content}`)
    .join('\n\n');

  const prompt = `${historyText ? `Recent conversation:\n${historyText}\n\n` : ''}Learner's new message: ${params.userMessage}`;

  const rawText = await generateContentWithFallback(prompt, {
    systemInstruction,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        reply: { type: Type.STRING },
        suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['reply', 'suggestedActions'],
    },
  });

  return JSON.parse(rawText || '{}') as {
    reply: string;
    suggestedActions: string[];
  };
}

// ============================================================================
// AGENT 6: AGENT ORCHESTRATOR (COORDINATING ALL 4 ADAPTIVE SCENARIOS)
// ============================================================================

export function getUserProfileAndSkills(userId: string) {
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
    | { id: string; name: string; email: string; role: string; organization_id: string | null; onboarding_completed: number; created_at: string }
    | undefined;
  const profRow = db.prepare('SELECT * FROM learner_profiles WHERE user_id = ?').get(userId) as
    | {
        id: string;
        user_id: string;
        education: string;
        experience: string;
        current_skill_level: SkillLevel;
        target_career: string;
        learning_style: string;
        weekly_hours: number;
        certifications_json: string;
        projects_json: string;
        interests_json: string;
        career_readiness_score: number;
        last_analyzed_at: string | null;
        updated_at: string;
      }
    | undefined;

  const skillRows = db.prepare('SELECT * FROM skills WHERE user_id = ? ORDER BY proficiency DESC').all(userId) as {
    id: string;
    user_id: string;
    name: string;
    category: 'Technical' | 'Soft';
    proficiency: number;
    level: SkillLevel;
    source: 'profile' | 'assessment' | 'module';
    is_strength: number;
    is_weakness: number;
    updated_at: string;
  }[];

  const skills: Skill[] = skillRows.map((s) => ({
    id: s.id,
    userId: s.user_id,
    name: s.name,
    category: s.category,
    proficiency: s.proficiency,
    level: s.level,
    source: s.source,
    isStrength: s.is_strength === 1,
    isWeakness: s.is_weakness === 1,
    updatedAt: s.updated_at,
  }));

  const profile: LearnerProfile | null = profRow
    ? {
        id: profRow.id,
        userId: profRow.user_id,
        education: profRow.education,
        experience: profRow.experience,
        currentSkillLevel: profRow.current_skill_level,
        targetCareer: profRow.target_career,
        learningStyle: profRow.learning_style as LearnerProfile['learningStyle'],
        weeklyHours: profRow.weekly_hours,
        certifications: JSON.parse(profRow.certifications_json || '[]'),
        projects: JSON.parse(profRow.projects_json || '[]'),
        interests: JSON.parse(profRow.interests_json || '[]'),
        careerReadinessScore: profRow.career_readiness_score,
        lastAnalyzedAt: profRow.last_analyzed_at,
        updatedAt: profRow.updated_at,
      }
    : null;

  return { userRow, profile, skills };
}

function saveNewLearningPath(params: {
  userId: string;
  targetCareer: string;
  readinessScore: number;
  strategySummary: string;
  agentNotes: {
    assessmentAgent: string;
    careerAgent: string;
    roadmapAgent: string;
    orchestratorNote: string;
  };
  modules: Omit<LearningResource, 'id' | 'learningPathId' | 'userId' | 'status' | 'completedAt'>[];
  preservedCompletedSkillNames?: Set<string>;
}) {
  const now = new Date().toISOString();
  const pathId = `path-${crypto.randomUUID().slice(0, 12)}`;

  // Remove old path for user (or replace active path)
  db.prepare('DELETE FROM learning_paths WHERE user_id = ?').run(params.userId);

  db.prepare(`
    INSERT INTO learning_paths (id, user_id, target_career, readiness_score, strategy_summary, agent_notes_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    pathId,
    params.userId,
    params.targetCareer,
    params.readinessScore,
    params.strategySummary,
    JSON.stringify(params.agentNotes),
    now,
    now
  );

  const insertMod = db.prepare(`
    INSERT INTO learning_resources (
      id, learning_path_id, user_id, phase, order_index, skill_name, title, resource_type, url, provider,
      learning_objectives_json, practical_exercise, expected_outcome, estimated_hours, difficulty, status, is_remedial, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  params.modules.forEach((m, index) => {
    const isPreserved =
      params.preservedCompletedSkillNames &&
      Array.from(params.preservedCompletedSkillNames).some(
        (sk) => sk.toLowerCase() === m.skillName.toLowerCase() && m.difficulty === 'Beginner'
      );

    let status: LearningResource['status'] = 'not_started';
    if (isPreserved) {
      status = 'completed';
    } else if (index === 0) {
      status = 'in_progress';
    } else if (index >= 4) {
      status = 'locked';
    }

    insertMod.run(
      `mod-${crypto.randomUUID().slice(0, 12)}`,
      pathId,
      params.userId,
      m.phase,
      index + 1,
      m.skillName,
      m.title,
      m.resourceType,
      m.url,
      m.provider,
      JSON.stringify(m.learningObjectives),
      m.practicalExercise,
      m.expectedOutcome,
      m.estimatedHours,
      m.difficulty,
      status,
      m.isRemedial ? 1 : 0,
      status === 'completed' ? now : null
    );
  });

  return pathId;
}

function addNotification(userId: string, type: string, title: string, message: string, actionTab: string | null) {
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, is_read, action_tab, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  `).run(crypto.randomUUID(), userId, type, title, message, actionTab, new Date().toISOString());
}

function logOrchestration(params: {
  userId: string;
  triggerEvent: string;
  agentsInvoked: string[];
  resolutionSummary: string;
  beforeReadiness: number;
  afterReadiness: number;
}) {
  db.prepare(`
    INSERT INTO agent_orchestration_logs (id, user_id, trigger_event, agents_invoked_json, resolution_summary, before_readiness, after_readiness, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    params.userId,
    params.triggerEvent,
    JSON.stringify(params.agentsInvoked),
    params.resolutionSummary,
    params.beforeReadiness,
    params.afterReadiness,
    new Date().toISOString()
  );
}

/**
 * Full Initial Orchestration (Onboarding -> Agent 1 -> Agent 2 -> Agent 3)
 */
export async function orchestrateOnboardingPipeline(params: {
  userId: string;
  name: string;
  education: string;
  experience: string;
  currentSkillLevel: SkillLevel;
  enteredSkills: { name: string; category: 'Technical' | 'Soft' }[];
  certifications: string[];
  projects: { title: string; description: string; technologies: string[] }[];
  interests: string[];
  targetCareer: string;
  learningStyle: string;
  weeklyHours: number;
}) {
  const now = new Date().toISOString();

  // Step 1: Agent 1 evaluates initial profile & skills
  const assessmentOutput = await runSkillAssessmentAgentProfileAnalysis({
    name: params.name,
    education: params.education,
    experience: params.experience,
    currentSkillLevel: params.currentSkillLevel,
    enteredSkills: params.enteredSkills,
    certifications: params.certifications,
    projects: params.projects,
    targetCareer: params.targetCareer,
  });

  // Persist skills
  db.prepare('DELETE FROM skills WHERE user_id = ?').run(params.userId);
  const insertSkill = db.prepare(`
    INSERT INTO skills (id, user_id, name, category, proficiency, level, source, is_strength, is_weakness, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'profile', ?, ?, ?)
  `);
  const savedSkills: Skill[] = assessmentOutput.evaluatedSkills.map((s) => {
    const id = crypto.randomUUID();
    const prof = Math.max(5, Math.min(100, Math.round(s.proficiency)));
    const lvl = toSkillLevel(prof);
    const cat = s.category === 'Soft' ? 'Soft' : 'Technical';
    insertSkill.run(id, params.userId, s.name, cat, prof, lvl, s.isStrength ? 1 : 0, s.isWeakness ? 1 : 0, now);
    return {
      id,
      userId: params.userId,
      name: s.name,
      category: cat,
      proficiency: prof,
      level: lvl,
      source: 'profile',
      isStrength: s.isStrength,
      isWeakness: s.isWeakness,
      updatedAt: now,
    };
  });

  // Step 2: Agent 2 analyzes career gap
  const careerResult = await runCareerIntelligenceAgent({
    targetCareer: params.targetCareer,
    currentSkills: savedSkills,
  });

  // Update profile & onboarding status
  db.prepare(`
    UPDATE learner_profiles
    SET education = ?, experience = ?, current_skill_level = ?, target_career = ?, learning_style = ?,
        weekly_hours = ?, certifications_json = ?, projects_json = ?, interests_json = ?,
        career_readiness_score = ?, last_analyzed_at = ?, updated_at = ?
    WHERE user_id = ?
  `).run(
    params.education,
    params.experience,
    params.currentSkillLevel,
    params.targetCareer,
    params.learningStyle,
    params.weeklyHours,
    JSON.stringify(params.certifications),
    JSON.stringify(params.projects),
    JSON.stringify(params.interests),
    careerResult.gapReport.readinessScore,
    now,
    now,
    params.userId
  );

  db.prepare('UPDATE users SET onboarding_completed = 1 WHERE id = ?').run(params.userId);

  // Step 3: Agent 3 generates personalized roadmap
  const roadmapResult = await runLearningPathAgent({
    targetCareer: params.targetCareer,
    learningStyle: params.learningStyle,
    weeklyHours: params.weeklyHours,
    gapReport: careerResult.gapReport,
  });

  const orchestratorNote = `Orchestrator coordinated Agents 1, 2, and 3 to establish baseline readiness (${careerResult.gapReport.readinessScore}%) and sequence ${roadmapResult.modules.length} modules for ${params.targetCareer}.`;

  saveNewLearningPath({
    userId: params.userId,
    targetCareer: params.targetCareer,
    readinessScore: careerResult.gapReport.readinessScore,
    strategySummary: roadmapResult.strategySummary,
    agentNotes: {
      assessmentAgent: assessmentOutput.reportSummary,
      careerAgent: careerResult.agentNote,
      roadmapAgent: roadmapResult.roadmapAgentNote,
      orchestratorNote,
    },
    modules: roadmapResult.modules,
  });

  db.prepare(`
    INSERT INTO progress_tracking (id, user_id, date, hours_logged, modules_completed, assessments_taken, readiness_snapshot, event_type, event_description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    params.userId,
    now.slice(0, 10),
    0.5,
    0,
    1,
    careerResult.gapReport.readinessScore,
    'onboarding',
    `Completed initial skill profiling for ${params.targetCareer}`,
    now
  );

  addNotification(
    params.userId,
    'roadmap',
    `Personalized ${params.targetCareer} Roadmap Ready`,
    `Agents 1–3 analyzed your profile (${careerResult.gapReport.readinessScore}% readiness) and created ${roadmapResult.modules.length} tailored learning modules.`,
    'roadmap'
  );

  logOrchestration({
    userId: params.userId,
    triggerEvent: `Onboarding Completed: Target Role ${params.targetCareer}`,
    agentsInvoked: ['Skill Assessment Agent', 'Career Intelligence Agent', 'Learning Path Recommendation Agent', 'Agent Orchestrator'],
    resolutionSummary: orchestratorNote,
    beforeReadiness: 0,
    afterReadiness: careerResult.gapReport.readinessScore,
  });

  return {
    readinessScore: careerResult.gapReport.readinessScore,
    gapReport: careerResult.gapReport,
  };
}

/**
 * SCENARIO A: Learner changes career goal
 */
export async function orchestrateCareerGoalChange(userId: string, newTargetCareer: string) {
  const { profile, skills } = getUserProfileAndSkills(userId);
  if (!profile) throw new Error('Learner profile not found.');

  const beforeReadiness = profile.careerReadinessScore;
  const now = new Date().toISOString();

  // Preserve completed modules where skill overlaps
  const existingCompleted = db
    .prepare(`SELECT DISTINCT skill_name FROM learning_resources WHERE user_id = ? AND status = 'completed'`)
    .all(userId) as { skill_name: string }[];
  const preservedSkillSet = new Set(existingCompleted.map((r) => r.skill_name));

  // Trigger Agent 2 (Career Intelligence)
  const careerResult = await runCareerIntelligenceAgent({
    targetCareer: newTargetCareer,
    currentSkills: skills,
  });

  // Update profile target career & readiness
  db.prepare(`
    UPDATE learner_profiles SET target_career = ?, career_readiness_score = ?, last_analyzed_at = ?, updated_at = ?
    WHERE user_id = ?
  `).run(newTargetCareer, careerResult.gapReport.readinessScore, now, now, userId);

  // Trigger Agent 3 (Learning Path) preserving overlapping progress
  const roadmapResult = await runLearningPathAgent({
    targetCareer: newTargetCareer,
    learningStyle: profile.learningStyle,
    weeklyHours: profile.weeklyHours,
    gapReport: careerResult.gapReport,
    preservedCompletedSkills: Array.from(preservedSkillSet),
  });

  const orchestratorNote = `Career Goal shifted from "${profile.targetCareer}" to "${newTargetCareer}". Preserved ${preservedSkillSet.size} completed skill domain(s) and re-sequenced remaining gaps.`;

  saveNewLearningPath({
    userId,
    targetCareer: newTargetCareer,
    readinessScore: careerResult.gapReport.readinessScore,
    strategySummary: roadmapResult.strategySummary,
    agentNotes: {
      assessmentAgent: `Carried forward ${skills.length} assessed skills from learner profile.`,
      careerAgent: careerResult.agentNote,
      roadmapAgent: roadmapResult.roadmapAgentNote,
      orchestratorNote,
    },
    modules: roadmapResult.modules,
    preservedCompletedSkillNames: preservedSkillSet,
  });

  addNotification(
    userId,
    'career',
    `Career Goal Updated to ${newTargetCareer}`,
    `Career Intelligence & Roadmap Agents recalculated your readiness (${careerResult.gapReport.readinessScore}%) and adapted your learning path while preserving overlapping completed work.`,
    'roadmap'
  );

  logOrchestration({
    userId,
    triggerEvent: `Scenario A — Career Goal Changed: ${profile.targetCareer} → ${newTargetCareer}`,
    agentsInvoked: ['Career Intelligence Agent', 'Learning Path Recommendation Agent', 'Agent Orchestrator'],
    resolutionSummary: orchestratorNote,
    beforeReadiness,
    afterReadiness: careerResult.gapReport.readinessScore,
  });

  return {
    newTargetCareer,
    readinessScore: careerResult.gapReport.readinessScore,
    gapReport: careerResult.gapReport,
    orchestratorNote,
  };
}

/**
 * SCENARIO B & C: Assessment Completed -> Progress Evaluation Agent -> Dynamic Adaptation
 */
export async function orchestrateAssessmentAdaptation(params: {
  userId: string;
  skillName: string;
  difficulty: SkillLevel;
  score: number;
  weakTopics: string[];
  strongTopics: string[];
}) {
  const { profile, skills } = getUserProfileAndSkills(params.userId);
  if (!profile) throw new Error('Profile not found.');

  const now = new Date().toISOString();
  const beforeReadiness = profile.careerReadinessScore;

  const existingSkill = skills.find((s) => s.name.toLowerCase() === params.skillName.toLowerCase());
  const prevProf = existingSkill ? existingSkill.proficiency : 30;

  // Trigger Agent 4: Progress Evaluation
  const evalResult = await runProgressEvaluationAgent({
    skillName: params.skillName,
    previousProficiency: prevProf,
    assessmentScore: params.score,
    difficulty: params.difficulty,
    weakTopics: params.weakTopics,
    strongTopics: params.strongTopics,
  });

  const calibratedProf = Math.max(5, Math.min(100, Math.round(evalResult.newProficiency)));
  const newLevel = toSkillLevel(calibratedProf);

  if (existingSkill) {
    db.prepare(`
      UPDATE skills SET proficiency = ?, level = ?, source = 'assessment', is_strength = ?, is_weakness = ?, updated_at = ?
      WHERE id = ?
    `).run(calibratedProf, newLevel, calibratedProf >= 70 ? 1 : 0, calibratedProf < 55 ? 1 : 0, now, existingSkill.id);
  } else {
    db.prepare(`
      INSERT INTO skills (id, user_id, name, category, proficiency, level, source, is_strength, is_weakness, updated_at)
      VALUES (?, ?, ?, 'Technical', ?, ?, 'assessment', ?, ?, ?)
    `).run(crypto.randomUUID(), params.userId, params.skillName, calibratedProf, newLevel, calibratedProf >= 70 ? 1 : 0, calibratedProf < 55 ? 1 : 0, now);
  }

  const updatedState = getUserProfileAndSkills(params.userId);
  const careerResult = await runCareerIntelligenceAgent({
    targetCareer: profile.targetCareer,
    currentSkills: updatedState.skills,
  });

  const afterReadiness = careerResult.gapReport.readinessScore;
  db.prepare(`UPDATE learner_profiles SET career_readiness_score = ?, updated_at = ? WHERE user_id = ?`).run(
    afterReadiness,
    now,
    params.userId
  );

  // Update active learning_path readiness
  const activePath = db.prepare('SELECT id FROM learning_paths WHERE user_id = ?').get(params.userId) as
    | { id: string }
    | undefined;

  let adaptationSummary = evalResult.evaluationNote;
  const agentsInvoked = ['Skill Assessment Agent', 'Progress Evaluation Agent', 'Career Intelligence Agent', 'Agent Orchestrator'];

  if (activePath) {
    db.prepare('UPDATE learning_paths SET readiness_score = ?, updated_at = ? WHERE id = ?').run(
      afterReadiness,
      now,
      activePath.id
    );

    if (evalResult.adaptationAction === 'insert_remedial') {
      // Scenario B: Poor performance -> Insert remedial module right at the front of incomplete modules
      agentsInvoked.splice(2, 0, 'Learning Path Recommendation Agent');
      const remedial = evalResult.remedialModuleSuggestion;
      const existingMods = db
        .prepare('SELECT id, order_index FROM learning_resources WHERE learning_path_id = ? ORDER BY order_index ASC')
        .all(activePath.id) as { id: string; order_index: number }[];

      for (const m of existingMods) {
        db.prepare('UPDATE learning_resources SET order_index = ? WHERE id = ?').run(m.order_index + 1, m.id);
      }

      db.prepare(`
        INSERT INTO learning_resources (
          id, learning_path_id, user_id, phase, order_index, skill_name, title, resource_type, url, provider,
          learning_objectives_json, practical_exercise, expected_outcome, estimated_hours, difficulty, status, is_remedial, completed_at
        ) VALUES (?, ?, ?, 'Beginner', 1, ?, ?, 'Tutorial', ?, ?, ?, ?, ?, ?, 'Beginner', 'in_progress', 1, NULL)
      `).run(
        `mod-rem-${crypto.randomUUID().slice(0, 8)}`,
        activePath.id,
        params.userId,
        params.skillName,
        remedial?.title || `Foundational Review: ${params.skillName} Core Concepts`,
        remedial?.url?.startsWith('http') ? remedial.url : 'https://roadmap.sh',
        remedial?.provider || 'Guided Tutorial',
        JSON.stringify(
          params.weakTopics.length
            ? params.weakTopics.map((t) => `Remediate gap in ${t}`)
            : [`Strengthen foundational ${params.skillName} concepts`]
        ),
        remedial?.practicalExercise || `Complete step-by-step practice drills covering ${params.weakTopics.join(', ') || params.skillName}.`,
        `Rebuild core confidence in ${params.skillName} before advancing.`,
        remedial?.estimatedHours || 4
      );

      addNotification(
        params.userId,
        'warning',
        `Adaptive Remedial Practice Added: ${params.skillName}`,
        `Score (${params.score}%) signaled weak areas (${params.weakTopics.join(', ') || 'foundations'}). The Learning Path Agent prioritized a targeted remedial tutorial.`,
        'roadmap'
      );
      adaptationSummary = `Scenario B Triggered: Poor score (${params.score}%). Inserted remedial tutorial "${remedial?.title || params.skillName + ' Foundations'}" at the top of your active roadmap.`;
    } else if (evalResult.adaptationAction === 'accelerate_advanced') {
      // Scenario C: Strong performance -> Mark redundant beginner modules for this skill as completed/skipped & append advanced project
      agentsInvoked.splice(2, 0, 'Learning Path Recommendation Agent');
      const beginnerSkipped = db
        .prepare(
          `UPDATE learning_resources SET status = 'completed', completed_at = ?
           WHERE learning_path_id = ? AND LOWER(skill_name) = LOWER(?) AND difficulty = 'Beginner' AND status != 'completed'`
        )
        .run(now, activePath.id, params.skillName);

      if (evalResult.advancedProjectSuggestion) {
        const adv = evalResult.advancedProjectSuggestion;
        const maxOrderRow = db
          .prepare('SELECT COALESCE(MAX(order_index), 0) as maxOrd FROM learning_resources WHERE learning_path_id = ?')
          .get(activePath.id) as { maxOrd: number };

        db.prepare(`
          INSERT INTO learning_resources (
            id, learning_path_id, user_id, phase, order_index, skill_name, title, resource_type, url, provider,
            learning_objectives_json, practical_exercise, expected_outcome, estimated_hours, difficulty, status, is_remedial, completed_at
          ) VALUES (?, ?, ?, 'Advanced', ?, ?, ?, 'Project', ?, ?, ?, ?, ?, ?, 'Advanced', 'not_started', 0, NULL)
        `).run(
          `mod-adv-${crypto.randomUUID().slice(0, 8)}`,
          activePath.id,
          params.userId,
          maxOrderRow.maxOrd + 1,
          params.skillName,
          adv.title,
          adv.url?.startsWith('http') ? adv.url : 'https://roadmap.sh',
          adv.provider || 'Applied Project',
          JSON.stringify([`Apply ${params.skillName} at production depth`, `Solve complex edge cases`]),
          adv.practicalExercise,
          `Demonstrate advanced ${params.skillName} mastery in portfolio.`,
          adv.estimatedHours || 8
        );
      }

      addNotification(
        params.userId,
        'milestone',
        `Strong Mastery in ${params.skillName} (${calibratedProf}%)`,
        `You scored ${params.score}%! Redundant beginner modules (${beginnerSkipped.changes}) were fast-tracked and an advanced applied project was added.`,
        'roadmap'
      );
      adaptationSummary = `Scenario C Triggered: Strong score (${params.score}%). Boosted ${params.skillName} to ${calibratedProf}% (${newLevel}), bypassed ${beginnerSkipped.changes} beginner module(s), and added advanced project work.`;
    } else {
      addNotification(
        params.userId,
        'summary',
        `Assessment Recorded: ${params.skillName} (${params.score}%)`,
        `Your ${params.skillName} proficiency is now ${calibratedProf}%. Career readiness updated to ${afterReadiness}%.`,
        'skills'
      );
    }
  }

  db.prepare(`
    INSERT INTO progress_tracking (id, user_id, date, hours_logged, modules_completed, assessments_taken, readiness_snapshot, event_type, event_description, created_at)
    VALUES (?, ?, ?, ?, 0, 1, ?, 'assessment', ?, ?)
  `).run(
    crypto.randomUUID(),
    params.userId,
    now.slice(0, 10),
    1.0,
    afterReadiness,
    `Completed ${params.difficulty} ${params.skillName} assessment (${params.score}%)`,
    now
  );

  logOrchestration({
    userId: params.userId,
    triggerEvent: `Assessment Evaluated: ${params.skillName} (${params.score}%)`,
    agentsInvoked,
    resolutionSummary: adaptationSummary,
    beforeReadiness,
    afterReadiness,
  });

  return {
    performanceBand: evalResult.performanceBand,
    newProficiency: calibratedProf,
    adaptationAction: evalResult.adaptationAction,
    adaptationSummary,
    beforeReadiness,
    afterReadiness,
  };
}

/**
 * SCENARIO D: Learner completes a learning module -> Unlock next + schedule verification assessment + update readiness
 */
export async function orchestrateModuleCompletion(userId: string, moduleId: string) {
  const mod = db
    .prepare('SELECT * FROM learning_resources WHERE id = ? AND user_id = ?')
    .get(moduleId, userId) as
    | {
        id: string;
        learning_path_id: string;
        skill_name: string;
        title: string;
        order_index: number;
        estimated_hours: number;
        difficulty: SkillLevel;
        status: string;
      }
    | undefined;

  if (!mod) throw new Error('Learning module not found.');
  if (mod.status === 'completed') {
    return { alreadyCompleted: true, message: 'Module is already marked completed.' };
  }

  const now = new Date().toISOString();
  const { profile, skills } = getUserProfileAndSkills(userId);
  const beforeReadiness = profile?.careerReadinessScore ?? 0;

  // 1. Mark module completed
  db.prepare(`UPDATE learning_resources SET status = 'completed', completed_at = ? WHERE id = ?`).run(now, moduleId);

  // 2. Boost skill proficiency from module completion (+8 pts capped at 95)
  const existingSkill = skills.find((s) => s.name.toLowerCase() === mod.skill_name.toLowerCase());
  if (existingSkill) {
    const boosted = Math.min(95, existingSkill.proficiency + 8);
    db.prepare(`UPDATE skills SET proficiency = ?, level = ?, source = 'module', is_strength = ?, is_weakness = ?, updated_at = ? WHERE id = ?`).run(
      boosted,
      toSkillLevel(boosted),
      boosted >= 70 ? 1 : 0,
      boosted < 55 ? 1 : 0,
      now,
      existingSkill.id
    );
  } else {
    const initBoost = mod.difficulty === 'Advanced' ? 65 : mod.difficulty === 'Intermediate' ? 50 : 35;
    db.prepare(`
      INSERT INTO skills (id, user_id, name, category, proficiency, level, source, is_strength, is_weakness, updated_at)
      VALUES (?, ?, ?, 'Technical', ?, ?, 'module', 0, ?, ?)
    `).run(crypto.randomUUID(), userId, mod.skill_name, initBoost, toSkillLevel(initBoost), initBoost < 55 ? 1 : 0, now);
  }

  // 3. Unlock next locked or not_started module
  const nextMod = db
    .prepare(
      `SELECT id, title, status FROM learning_resources
       WHERE learning_path_id = ? AND status IN ('locked', 'not_started')
       ORDER BY order_index ASC LIMIT 1`
    )
    .get(mod.learning_path_id) as { id: string; title: string; status: string } | undefined;

  if (nextMod) {
    db.prepare(`UPDATE learning_resources SET status = 'in_progress' WHERE id = ?`).run(nextMod.id);
  }

  // Unlock one locked module further down if any remain locked
  const lockedMod = db
    .prepare(
      `SELECT id FROM learning_resources WHERE learning_path_id = ? AND status = 'locked' ORDER BY order_index ASC LIMIT 1`
    )
    .get(mod.learning_path_id) as { id: string } | undefined;
  if (lockedMod) {
    db.prepare(`UPDATE learning_resources SET status = 'not_started' WHERE id = ?`).run(lockedMod.id);
  }

  // 4. Recalculate readiness via Agent 2
  const updated = getUserProfileAndSkills(userId);
  const careerResult = await runCareerIntelligenceAgent({
    targetCareer: profile?.targetCareer || 'AI Engineer',
    currentSkills: updated.skills,
  });
  const afterReadiness = careerResult.gapReport.readinessScore;

  db.prepare(`UPDATE learner_profiles SET career_readiness_score = ?, updated_at = ? WHERE user_id = ?`).run(
    afterReadiness,
    now,
    userId
  );
  db.prepare(`UPDATE learning_paths SET readiness_score = ?, updated_at = ? WHERE id = ?`).run(
    afterReadiness,
    now,
    mod.learning_path_id
  );

  // 5. Log progress tracking
  db.prepare(`
    INSERT INTO progress_tracking (id, user_id, date, hours_logged, modules_completed, assessments_taken, readiness_snapshot, event_type, event_description, created_at)
    VALUES (?, ?, ?, ?, 1, 0, ?, 'module_completed', ?, ?)
  `).run(
    crypto.randomUUID(),
    userId,
    now.slice(0, 10),
    mod.estimated_hours || 4,
    afterReadiness,
    `Completed "${mod.title}" (${mod.skill_name})`,
    now
  );

  // 6. Notify learner to take verification assessment & show unlocked module
  addNotification(
    userId,
    'milestone',
    `Module Completed: ${mod.title}`,
    `Your ${mod.skill_name} proficiency increased and readiness reached ${afterReadiness}%. ${
      nextMod ? `Unlocked next module: "${nextMod.title}".` : ''
    } Take a short skill assessment to validate mastery.`,
    'assessments'
  );

  logOrchestration({
    userId,
    triggerEvent: `Scenario D — Module Completed: ${mod.title}`,
    agentsInvoked: ['Progress Evaluation Agent', 'Career Intelligence Agent', 'Agent Orchestrator'],
    resolutionSummary: `Recorded completion of "${mod.title}", boosted ${mod.skill_name} proficiency, updated readiness to ${afterReadiness}%, and unlocked "${nextMod?.title || 'final milestone'}".`,
    beforeReadiness,
    afterReadiness,
  });

  return {
    alreadyCompleted: false,
    completedModuleTitle: mod.title,
    unlockedModuleTitle: nextMod?.title || null,
    skillName: mod.skill_name,
    recommendedDifficulty: mod.difficulty,
    beforeReadiness,
    afterReadiness,
  };
}

/**
 * Organization Group Training Program Generator (Gemini)
 */
export async function runOrganizationTrainingAgent(params: {
  organizationName: string;
  commonGaps: { skillName: string; avgGap: number; affectedCount: number }[];
  departmentMetrics: { department: string; memberCount: number; avgReadiness: number }[];
}) {
  const prompt = `
You are an Enterprise L&D Career Intelligence Agent advising "${params.organizationName}".
Given these workforce skill gap analytics:
- Top Common Skill Gaps: ${JSON.stringify(params.commonGaps)}
- Department Readiness: ${JSON.stringify(params.departmentMetrics)}

Recommend 3 high-impact cohort training programs specifying: title, targetDepartment, targetSkills (array), rationale, and estimatedWeeks (integer).
`;

  const rawText = await generateContentWithFallback(prompt, {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        programs: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              targetDepartment: { type: Type.STRING },
              targetSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
              rationale: { type: Type.STRING },
              estimatedWeeks: { type: Type.INTEGER },
            },
            required: ['title', 'targetDepartment', 'targetSkills', 'rationale', 'estimatedWeeks'],
          },
        },
      },
      required: ['programs'],
    },
  });

  const parsed = JSON.parse(rawText || '{"programs":[]}') as {
    programs: {
      title: string;
      targetDepartment: string;
      targetSkills: string[];
      rationale: string;
      estimatedWeeks: number;
    }[];
  };
  return parsed.programs || [];
}
