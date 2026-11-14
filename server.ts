import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  getUserProfileAndSkills,
  normalizeGeminiError,
  orchestrateAssessmentAdaptation,
  orchestrateCareerGoalChange,
  orchestrateModuleCompletion,
  orchestrateOnboardingPipeline,
  runAIMentorAgent,
  runCareerIntelligenceAgent,
  runOrganizationTrainingAgent,
  runSkillAssessmentAgentEvaluateQuiz,
  runSkillAssessmentAgentGenerateQuiz,
} from './server/agents.ts';
import {
  type AuthedRequest,
  getUserById,
  hashPassword,
  requireAuth,
  requireOrgRole,
  signToken,
  verifyPassword,
} from './server/auth.ts';
import { db, initDatabase } from './server/db.ts';
import { seedDatabase } from './server/seed.ts';
import type {
  AppNotification,
  AssessmentQuestion,
  AssessmentResult,
  CareerRole,
  LearningPath,
  LearningResource,
  MentorMessage,
  OrchestrationLog,
  OrganizationAnalytics,
  OrganizationMemberSummary,
  ProgressEntry,
  SkillLevel,
  UserRole,
} from './src/types.ts';

dotenv.config();

initDatabase();
seedDatabase();

const app = express();
app.use(express.json({ limit: '2mb' }));

function sendApiError(res: express.Response, err: unknown, fallback = 'An unexpected error occurred.') {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('API_KEY_INVALID') ||
    raw.includes('NOT_FOUND') ||
    (err as { name?: string })?.name === 'GeminiServiceError'
  ) {
    const normalized = normalizeGeminiError(err);
    res.status(normalized.statusCode).json({ error: normalized.message, code: normalized.code });
    return;
  }
  res.status(500).json({ error: raw || fallback });
}

// Helper to hydrate LearningPath + LearningResource[]
function getLearningPathForUser(userId: string): LearningPath | null {
  const pathRow = db
    .prepare('SELECT * FROM learning_paths WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1')
    .get(userId) as
    | {
        id: string;
        user_id: string;
        target_career: string;
        readiness_score: number;
        strategy_summary: string;
        agent_notes_json: string;
        created_at: string;
        updated_at: string;
      }
    | undefined;

  if (!pathRow) return null;

  const resourceRows = db
    .prepare('SELECT * FROM learning_resources WHERE learning_path_id = ? ORDER BY order_index ASC')
    .all(pathRow.id) as {
    id: string;
    learning_path_id: string;
    user_id: string;
    phase: SkillLevel;
    order_index: number;
    skill_name: string;
    title: string;
    resource_type: LearningResource['resourceType'];
    url: string;
    provider: string;
    learning_objectives_json: string;
    practical_exercise: string;
    expected_outcome: string;
    estimated_hours: number;
    difficulty: SkillLevel;
    status: LearningResource['status'];
    is_remedial: number;
    completed_at: string | null;
  }[];

  const resources: LearningResource[] = resourceRows.map((r) => ({
    id: r.id,
    learningPathId: r.learning_path_id,
    userId: r.user_id,
    phase: r.phase,
    orderIndex: r.order_index,
    skillName: r.skill_name,
    title: r.title,
    resourceType: r.resource_type,
    url: r.url,
    provider: r.provider,
    learningObjectives: JSON.parse(r.learning_objectives_json || '[]'),
    practicalExercise: r.practical_exercise,
    expectedOutcome: r.expected_outcome,
    estimatedHours: r.estimated_hours,
    difficulty: r.difficulty,
    status: r.status,
    isRemedial: r.is_remedial === 1,
    completedAt: r.completed_at,
  }));

  const defaultNotes = {
    assessmentAgent: '',
    careerAgent: '',
    roadmapAgent: '',
    orchestratorNote: '',
  };

  return {
    id: pathRow.id,
    userId: pathRow.user_id,
    targetCareer: pathRow.target_career,
    readinessScore: pathRow.readiness_score,
    strategySummary: pathRow.strategy_summary,
    agentNotes: { ...defaultNotes, ...JSON.parse(pathRow.agent_notes_json || '{}') },
    resources,
    createdAt: pathRow.created_at,
    updatedAt: pathRow.updated_at,
  };
}

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

app.post('/api/auth/signup', (req, res) => {
  try {
    const { name, email, password, role, organizationName, organizationType } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      organizationName?: string;
      organizationType?: 'University' | 'Enterprise';
    };

    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      res.status(400).json({ error: 'Name, valid email, and password (6+ characters) are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const validRole: UserRole = role === 'employee' || role === 'organization' ? role : 'student';
    const userId = `user-${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    let orgId: string | null = null;

    if (validRole === 'organization') {
      orgId = `org-${crypto.randomUUID().slice(0, 10)}`;
      db.prepare(`
        INSERT INTO organizations (id, name, type, industry, owner_user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        orgId,
        organizationName?.trim() || `${name.trim()}'s Organization`,
        organizationType === 'University' ? 'University' : 'Enterprise',
        'Technology & Learning',
        userId,
        now
      );
    }

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, organization_id, onboarding_completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(userId, normalizedEmail, hashPassword(password), name.trim(), validRole, orgId, now);

    db.prepare(`
      INSERT INTO learner_profiles (
        id, user_id, education, experience, current_skill_level, target_career, learning_style,
        weekly_hours, certifications_json, projects_json, interests_json, career_readiness_score, updated_at
      ) VALUES (?, ?, '', '', 'Beginner', '', 'Mixed Structured', 8, '[]', '[]', '[]', 0, ?)
    `).run(`prof-${crypto.randomUUID().slice(0, 10)}`, userId, now);

    const token = signToken(userId, validRole);
    const user = getUserById(userId);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const row = db
      .prepare('SELECT id, password_hash, role FROM users WHERE email = ?')
      .get(email.trim().toLowerCase()) as { id: string; password_hash: string; role: UserRole } | undefined;

    if (!row || !verifyPassword(password, row.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = signToken(row.id, row.role);
    const user = getUserById(row.id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.authUser });
});

// ============================================================================
// ONBOARDING & INITIAL MULTI-AGENT ORCHESTRATION
// ============================================================================

app.post('/api/onboarding/complete', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = req.authUser!;
    const {
      education,
      experience,
      currentSkillLevel,
      skills,
      certifications,
      projects,
      interests,
      targetCareer,
      learningStyle,
      weeklyHours,
    } = req.body as {
      education: string;
      experience: string;
      currentSkillLevel: SkillLevel;
      skills: { name: string; category: 'Technical' | 'Soft' }[];
      certifications: string[];
      projects: { title: string; description: string; technologies: string[] }[];
      interests: string[];
      targetCareer: string;
      learningStyle: string;
      weeklyHours: number;
    };

    if (!targetCareer?.trim()) {
      res.status(400).json({ error: 'Target career goal is required.' });
      return;
    }

    const result = await orchestrateOnboardingPipeline({
      userId: user.id,
      name: user.name,
      education: education || '',
      experience: experience || '',
      currentSkillLevel: currentSkillLevel || 'Beginner',
      enteredSkills: Array.isArray(skills) && skills.length > 0 ? skills : [{ name: 'Problem Solving', category: 'Soft' }],
      certifications: Array.isArray(certifications) ? certifications : [],
      projects: Array.isArray(projects) ? projects : [],
      interests: Array.isArray(interests) ? interests : [],
      targetCareer: targetCareer.trim(),
      learningStyle: learningStyle || 'Mixed Structured',
      weeklyHours: Math.max(1, Number(weeklyHours) || 8),
    });

    const updatedUser = getUserById(user.id);
    res.json({ user: updatedUser, ...result });
  } catch (err) {
    console.error('Onboarding orchestration error:', err);
    sendApiError(res, err, 'Failed to analyze profile with Gemini agents.');
  }
});

// ============================================================================
// DASHBOARD & PROFILE AGGREGATION
// ============================================================================

app.get('/api/dashboard', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = req.authUser!;
    const { profile, skills } = getUserProfileAndSkills(user.id);
    const learningPath = getLearningPathForUser(user.id);

    let gapReport = null;
    if (profile?.targetCareer) {
      const careerAnalysis = await runCareerIntelligenceAgent({
        targetCareer: profile.targetCareer,
        currentSkills: skills,
      });
      gapReport = careerAnalysis.gapReport;
      if (gapReport.readinessScore !== profile.careerReadinessScore) {
        db.prepare('UPDATE learner_profiles SET career_readiness_score = ? WHERE user_id = ?').run(
          gapReport.readinessScore,
          user.id
        );
        profile.careerReadinessScore = gapReport.readinessScore;
      }
    }

    const progressHistory = db
      .prepare('SELECT * FROM progress_tracking WHERE user_id = ? ORDER BY created_at ASC')
      .all(user.id) as {
      id: string;
      user_id: string;
      date: string;
      hours_logged: number;
      modules_completed: number;
      assessments_taken: number;
      readiness_snapshot: number;
      event_type: string;
      event_description: string;
      created_at: string;
    }[];

    const formattedProgress: ProgressEntry[] = progressHistory.map((p) => ({
      id: p.id,
      userId: p.user_id,
      date: p.date,
      hoursLogged: p.hours_logged,
      modulesCompleted: p.modules_completed,
      assessmentsTaken: p.assessments_taken,
      readinessSnapshot: p.readiness_snapshot,
      eventType: p.event_type,
      eventDescription: p.event_description,
      createdAt: p.created_at,
    }));

    const resultRows = db
      .prepare('SELECT * FROM assessment_results WHERE user_id = ? ORDER BY created_at DESC')
      .all(user.id) as {
      id: string;
      assessment_id: string;
      user_id: string;
      skill_name: string;
      difficulty: SkillLevel;
      score: number;
      correct_count: number;
      total_count: number;
      feedback_json: string;
      weak_topics_json: string;
      strong_topics_json: string;
      ai_evaluation_summary: string;
      created_at: string;
    }[];

    const assessmentResults: AssessmentResult[] = resultRows.map((r) => ({
      id: r.id,
      assessmentId: r.assessment_id,
      userId: r.user_id,
      skillName: r.skill_name,
      difficulty: r.difficulty,
      score: r.score,
      correctCount: r.correct_count,
      totalCount: r.total_count,
      feedback: JSON.parse(r.feedback_json || '[]'),
      weakTopics: JSON.parse(r.weak_topics_json || '[]'),
      strongTopics: JSON.parse(r.strong_topics_json || '[]'),
      aiEvaluationSummary: r.ai_evaluation_summary,
      createdAt: r.created_at,
    }));

    const notifRows = db
      .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30')
      .all(user.id) as {
      id: string;
      user_id: string;
      type: AppNotification['type'];
      title: string;
      message: string;
      is_read: number;
      action_tab: string | null;
      created_at: string;
    }[];

    const notifications: AppNotification[] = notifRows.map((n) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.is_read === 1,
      actionTab: n.action_tab,
      createdAt: n.created_at,
    }));

    const logRows = db
      .prepare('SELECT * FROM agent_orchestration_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 15')
      .all(user.id) as {
      id: string;
      user_id: string;
      trigger_event: string;
      agents_invoked_json: string;
      resolution_summary: string;
      before_readiness: number;
      after_readiness: number;
      created_at: string;
    }[];

    const orchestrationLogs: OrchestrationLog[] = logRows.map((l) => ({
      id: l.id,
      userId: l.user_id,
      triggerEvent: l.trigger_event,
      agentsInvoked: JSON.parse(l.agents_invoked_json || '[]'),
      resolutionSummary: l.resolution_summary,
      beforeReadiness: l.before_readiness,
      afterReadiness: l.after_readiness,
      createdAt: l.created_at,
    }));

    res.json({
      user,
      profile,
      skills,
      gapReport,
      learningPath,
      progressHistory: formattedProgress,
      assessmentResults,
      notifications,
      orchestrationLogs,
    });
  } catch (err) {
    console.error('Dashboard load error:', err);
    sendApiError(res, err, 'Failed to load dashboard.');
  }
});

// ============================================================================
// PROFILE & SKILLS MANAGEMENT
// ============================================================================

app.put('/api/profile', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = req.authUser!;
    const {
      name,
      education,
      experience,
      currentSkillLevel,
      targetCareer,
      learningStyle,
      weeklyHours,
      certifications,
      projects,
      interests,
    } = req.body;

    const { profile } = getUserProfileAndSkills(user.id);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    const now = new Date().toISOString();
    if (name?.trim()) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), user.id);
    }

    const careerChanged =
      targetCareer?.trim() && targetCareer.trim().toLowerCase() !== profile.targetCareer.toLowerCase();

    db.prepare(`
      UPDATE learner_profiles
      SET education = ?, experience = ?, current_skill_level = ?, learning_style = ?, weekly_hours = ?,
          certifications_json = ?, projects_json = ?, interests_json = ?, updated_at = ?
      WHERE user_id = ?
    `).run(
      education ?? profile.education,
      experience ?? profile.experience,
      currentSkillLevel ?? profile.currentSkillLevel,
      learningStyle ?? profile.learningStyle,
      Math.max(1, Number(weeklyHours) || profile.weeklyHours),
      JSON.stringify(certifications ?? profile.certifications),
      JSON.stringify(projects ?? profile.projects),
      JSON.stringify(interests ?? profile.interests),
      now,
      user.id
    );

    let careerAdaptation = null;
    if (careerChanged) {
      // Scenario A: Career Goal Change triggers Agent 2 & Agent 3
      careerAdaptation = await orchestrateCareerGoalChange(user.id, targetCareer.trim());
    }

    res.json({
      user: getUserById(user.id),
      careerChanged: Boolean(careerChanged),
      careerAdaptation,
    });
  } catch (err) {
    sendApiError(res, err, 'Failed to update profile.');
  }
});

app.post('/api/skills', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = req.authUser!;
    const { name, category, proficiency } = req.body as {
      name?: string;
      category?: 'Technical' | 'Soft';
      proficiency?: number;
    };

    if (!name?.trim()) {
      res.status(400).json({ error: 'Skill name is required.' });
      return;
    }

    const prof = Math.max(0, Math.min(100, Number(proficiency ?? 50)));
    const level: SkillLevel = prof >= 75 ? 'Advanced' : prof >= 45 ? 'Intermediate' : 'Beginner';
    const now = new Date().toISOString();

    const existing = db
      .prepare('SELECT id FROM skills WHERE user_id = ? AND LOWER(name) = LOWER(?)')
      .get(user.id, name.trim()) as { id: string } | undefined;

    if (existing) {
      db.prepare(`
        UPDATE skills SET proficiency = ?, level = ?, category = ?, is_strength = ?, is_weakness = ?, updated_at = ?
        WHERE id = ?
      `).run(prof, level, category === 'Soft' ? 'Soft' : 'Technical', prof >= 70 ? 1 : 0, prof < 55 ? 1 : 0, now, existing.id);
    } else {
      db.prepare(`
        INSERT INTO skills (id, user_id, name, category, proficiency, level, source, is_strength, is_weakness, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'profile', ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        user.id,
        name.trim(),
        category === 'Soft' ? 'Soft' : 'Technical',
        prof,
        level,
        prof >= 70 ? 1 : 0,
        prof < 55 ? 1 : 0,
        now
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/skills/:id', requireAuth, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  db.prepare('DELETE FROM skills WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ success: true });
});

// ============================================================================
// CAREERS & SKILL GAP ANALYSIS
// ============================================================================

app.get('/api/careers', requireAuth, (_req, res) => {
  const rows = db.prepare('SELECT * FROM career_roles ORDER BY title ASC').all() as {
    id: string;
    title: string;
    domain: string;
    description: string;
    required_skills_json: string;
    avg_salary_range: string;
    demand_level: string;
  }[];

  const roles: CareerRole[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    domain: r.domain,
    description: r.description,
    requiredSkills: JSON.parse(r.required_skills_json || '[]'),
    avgSalaryRange: r.avg_salary_range,
    demandLevel: r.demand_level,
  }));

  res.json({ roles });
});

app.post('/api/careers/select', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = req.authUser!;
    const { targetCareer } = req.body as { targetCareer?: string };
    if (!targetCareer?.trim()) {
      res.status(400).json({ error: 'Target career title is required.' });
      return;
    }

    const result = await orchestrateCareerGoalChange(user.id, targetCareer.trim());
    res.json(result);
  } catch (err) {
    sendApiError(res, err, 'Failed to update career goal.');
  }
});

// ============================================================================
// LEARNING ROADMAP & MODULE LIFECYCLE
// ============================================================================

app.patch('/api/roadmap/modules/:id/status', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = req.authUser!;
    const moduleId = String(req.params.id);
    const { status } = req.body as { status?: LearningResource['status'] };

    if (status === 'completed') {
      // Scenario D: Complete module -> Unlock next + prompt assessment + update readiness
      const result = await orchestrateModuleCompletion(user.id, moduleId);
      res.json(result);
      return;
    }

    if (status === 'in_progress' || status === 'not_started') {
      const updated = db
        .prepare('UPDATE learning_resources SET status = ? WHERE id = ? AND user_id = ?')
        .run(status, moduleId, user.id);
      if (updated.changes === 0) {
        res.status(404).json({ error: 'Module not found.' });
        return;
      }
      if (status === 'in_progress') {
        const mod = db.prepare('SELECT title FROM learning_resources WHERE id = ?').get(moduleId) as { title: string };
        db.prepare(`
          INSERT INTO progress_tracking (id, user_id, date, hours_logged, modules_completed, assessments_taken, readiness_snapshot, event_type, event_description, created_at)
          VALUES (?, ?, ?, 0.5, 0, 0, ?, 'study', ?, ?)
        `).run(
          crypto.randomUUID(),
          user.id,
          new Date().toISOString().slice(0, 10),
          getUserProfileAndSkills(user.id).profile?.careerReadinessScore ?? 0,
          `Started module "${mod.title}"`,
          new Date().toISOString()
        );
      }
      res.json({ success: true, status });
      return;
    }

    res.status(400).json({ error: 'Invalid module status.' });
  } catch (err) {
    sendApiError(res, err, 'Failed to update module status.');
  }
});

app.post('/api/roadmap/regenerate', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = req.authUser!;
    const { profile } = getUserProfileAndSkills(user.id);
    if (!profile?.targetCareer) {
      res.status(400).json({ error: 'Please select a target career first.' });
      return;
    }
    const result = await orchestrateCareerGoalChange(user.id, profile.targetCareer);
    res.json(result);
  } catch (err) {
    sendApiError(res, err, 'Failed to regenerate learning roadmap.');
  }
});

// ============================================================================
// AI-POWERED ASSESSMENT MODULE
// ============================================================================

app.post('/api/assessments/generate', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = req.authUser!;
    const { skillName, difficulty, weakTopics } = req.body as {
      skillName?: string;
      difficulty?: SkillLevel;
      weakTopics?: string[];
    };

    if (!skillName?.trim()) {
      res.status(400).json({ error: 'Skill name is required to generate an assessment.' });
      return;
    }

    const { profile } = getUserProfileAndSkills(user.id);
    const diff: SkillLevel =
      difficulty === 'Beginner' || difficulty === 'Advanced' ? difficulty : 'Intermediate';

    const questions = await runSkillAssessmentAgentGenerateQuiz({
      skillName: skillName.trim(),
      difficulty: diff,
      targetCareer: profile?.targetCareer || 'Software & AI Engineering',
      weakTopics,
    });

    const assessmentId = `assess-${crypto.randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO skill_assessments (id, user_id, skill_name, difficulty, questions_json, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(assessmentId, user.id, skillName.trim(), diff, JSON.stringify(questions), now);

    // Strip correct answers before returning to client? Wait: keep client clean (send without correctOptionIndex/explanation!)
    const sanitizedQuestions = questions.map(({ correctOptionIndex: _c, explanation: _e, ...rest }) => rest);

    res.json({
      assessment: {
        id: assessmentId,
        userId: user.id,
        skillName: skillName.trim(),
        difficulty: diff,
        questions: sanitizedQuestions,
        status: 'pending',
        createdAt: now,
      },
    });
  } catch (err) {
    console.error('Assessment generation error:', err);
    sendApiError(res, err, 'Failed to generate assessment.');
  }
});

app.post('/api/assessments/:id/submit', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = req.authUser!;
    const assessmentId = String(req.params.id);
    const { answers } = req.body as { answers: Record<string, string | number> };

    const row = db
      .prepare('SELECT * FROM skill_assessments WHERE id = ? AND user_id = ?')
      .get(assessmentId, user.id) as
      | {
          id: string;
          skill_name: string;
          difficulty: SkillLevel;
          questions_json: string;
          status: string;
        }
      | undefined;

    if (!row) {
      res.status(404).json({ error: 'Assessment not found.' });
      return;
    }

    const questions = JSON.parse(row.questions_json) as AssessmentQuestion[];

    // Agent 1 evaluates answers (MCQ auto-graded + Gemini descriptive grading)
    const evaluation = await runSkillAssessmentAgentEvaluateQuiz({
      skillName: row.skill_name,
      difficulty: row.difficulty,
      questions,
      answers: answers || {},
    });

    const resultId = `res-${crypto.randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();

    db.prepare(`UPDATE skill_assessments SET status = 'completed' WHERE id = ?`).run(assessmentId);

    db.prepare(`
      INSERT INTO assessment_results (
        id, assessment_id, user_id, skill_name, difficulty, score, correct_count, total_count,
        answers_json, feedback_json, weak_topics_json, strong_topics_json, ai_evaluation_summary, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      resultId,
      assessmentId,
      user.id,
      row.skill_name,
      row.difficulty,
      evaluation.score,
      evaluation.correctCount,
      evaluation.totalCount,
      JSON.stringify(answers || {}),
      JSON.stringify(evaluation.feedback),
      JSON.stringify(evaluation.weakTopics),
      JSON.stringify(evaluation.strongTopics),
      evaluation.aiEvaluationSummary,
      now
    );

    // Trigger Agent 4 + Agent 6 (Scenarios B / C adaptive roadmap update!)
    const adaptation = await orchestrateAssessmentAdaptation({
      userId: user.id,
      skillName: row.skill_name,
      difficulty: row.difficulty,
      score: evaluation.score,
      weakTopics: evaluation.weakTopics,
      strongTopics: evaluation.strongTopics,
    });

    const resultObj: AssessmentResult = {
      id: resultId,
      assessmentId,
      userId: user.id,
      skillName: row.skill_name,
      difficulty: row.difficulty,
      score: evaluation.score,
      correctCount: evaluation.correctCount,
      totalCount: evaluation.totalCount,
      feedback: evaluation.feedback,
      weakTopics: evaluation.weakTopics,
      strongTopics: evaluation.strongTopics,
      aiEvaluationSummary: evaluation.aiEvaluationSummary,
      createdAt: now,
    };

    res.json({ result: resultObj, adaptation });
  } catch (err) {
    console.error('Assessment submission error:', err);
    sendApiError(res, err, 'Failed to evaluate assessment.');
  }
});

// ============================================================================
// AI MENTOR CONVERSATIONS
// ============================================================================

app.get('/api/mentor/messages', requireAuth, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  const rows = db
    .prepare('SELECT * FROM mentor_conversations WHERE user_id = ? ORDER BY created_at ASC')
    .all(user.id) as {
    id: string;
    user_id: string;
    role: 'user' | 'assistant';
    content: string;
    suggested_actions_json: string;
    created_at: string;
  }[];

  const messages: MentorMessage[] = rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    role: r.role,
    content: r.content,
    suggestedActions: JSON.parse(r.suggested_actions_json || '[]'),
    createdAt: r.created_at,
  }));

  res.json({ messages });
});

app.post('/api/mentor/chat', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = req.authUser!;
    const { message } = req.body as { message?: string };
    if (!message?.trim()) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }

    const { profile, skills } = getUserProfileAndSkills(user.id);
    if (!profile) {
      res.status(404).json({ error: 'Learner profile not found.' });
      return;
    }

    const learningPath = getLearningPathForUser(user.id);
    const recentResultRows = db
      .prepare('SELECT skill_name, score, weak_topics_json FROM assessment_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 4')
      .all(user.id) as { skill_name: string; score: number; weak_topics_json: string }[];

    const historyRows = db
      .prepare('SELECT role, content FROM mentor_conversations WHERE user_id = ? ORDER BY created_at ASC')
      .all(user.id) as { role: 'user' | 'assistant'; content: string }[];

    const mentorResponse = await runAIMentorAgent({
      userName: user.name,
      profile,
      skills,
      roadmapModules: learningPath?.resources || [],
      recentResults: recentResultRows.map((r) => ({
        skillName: r.skill_name,
        score: r.score,
        weakTopics: JSON.parse(r.weak_topics_json || '[]'),
      })),
      conversationHistory: historyRows,
      userMessage: message.trim(),
    });

    const userMsgTime = new Date().toISOString();
    const userMsgId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO mentor_conversations (id, user_id, role, content, context_snapshot_json, suggested_actions_json, created_at)
      VALUES (?, ?, 'user', ?, '{}', '[]', ?)
    `).run(userMsgId, user.id, message.trim(), userMsgTime);

    const assistantTime = new Date(Date.now() + 10).toISOString();
    const assistantMsgId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO mentor_conversations (id, user_id, role, content, context_snapshot_json, suggested_actions_json, created_at)
      VALUES (?, ?, 'assistant', ?, ?, ?, ?)
    `).run(
      assistantMsgId,
      user.id,
      mentorResponse.reply,
      JSON.stringify({ targetCareer: profile.targetCareer, readiness: profile.careerReadinessScore }),
      JSON.stringify(mentorResponse.suggestedActions || []),
      assistantTime
    );

    res.json({
      userMessage: {
        id: userMsgId,
        userId: user.id,
        role: 'user',
        content: message.trim(),
        suggestedActions: [],
        createdAt: userMsgTime,
      },
      assistantMessage: {
        id: assistantMsgId,
        userId: user.id,
        role: 'assistant',
        content: mentorResponse.reply,
        suggestedActions: mentorResponse.suggestedActions || [],
        createdAt: assistantTime,
      },
    });
  } catch (err) {
    console.error('Mentor chat error:', err);
    sendApiError(res, err, 'Failed to get AI mentor response.');
  }
});

// ============================================================================
// NOTIFICATIONS
// ============================================================================

app.patch('/api/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(
    req.params.id,
    req.authUser!.id
  );
  res.json({ success: true });
});

app.post('/api/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.authUser!.id);
  res.json({ success: true });
});

// ============================================================================
// ORGANIZATION & UNIVERSITY DASHBOARD (AUTHORIZED ROLE ONLY)
// ============================================================================

app.get('/api/organization/analytics', requireAuth, requireOrgRole, async (req: AuthedRequest, res) => {
  try {
    const user = req.authUser!;
    const orgRow = db
      .prepare('SELECT * FROM organizations WHERE id = ? OR owner_user_id = ? LIMIT 1')
      .get(user.organizationId, user.id) as
      | { id: string; name: string; type: 'University' | 'Enterprise'; industry: string }
      | undefined;

    if (!orgRow) {
      res.status(404).json({ error: 'Organization record not found.' });
      return;
    }

    const memberRows = db
      .prepare(
        `SELECT om.id as member_id, om.department, om.job_title, u.id as user_id, u.name, u.email,
                lp.target_career, lp.career_readiness_score
         FROM organization_members om
         JOIN users u ON u.id = om.user_id
         LEFT JOIN learner_profiles lp ON lp.user_id = u.id
         WHERE om.organization_id = ?`
      )
      .all(orgRow.id) as {
      member_id: string;
      department: string;
      job_title: string;
      user_id: string;
      name: string;
      email: string;
      target_career: string | null;
      career_readiness_score: number | null;
    }[];

    const members: OrganizationMemberSummary[] = [];
    const skillGapAggregator = new Map<string, { totalGap: number; count: number }>();
    const deptAggregator = new Map<
      string,
      { count: number; readinessSum: number; profSum: number; profCount: number; completionSum: number }
    >();

    for (const m of memberRows) {
      const { skills } = getUserProfileAndSkills(m.user_id);
      const path = getLearningPathForUser(m.user_id);
      const totalMods = path?.resources.length || 0;
      const doneMods = path?.resources.filter((r) => r.status === 'completed').length || 0;
      const completionPct = totalMods > 0 ? Math.round((doneMods / totalMods) * 100) : 0;

      let topGaps: { skillName: string; gap: number; priority: string }[] = [];
      if (m.target_career) {
        const analysis = await runCareerIntelligenceAgent({
          targetCareer: m.target_career,
          currentSkills: skills,
        });
        topGaps = analysis.gapReport.gaps
          .filter((g) => g.gap > 0)
          .sort((a, b) => b.gap - a.gap)
          .slice(0, 3)
          .map((g) => ({ skillName: g.skillName, gap: g.gap, priority: g.priority }));

        for (const g of analysis.gapReport.gaps) {
          if (g.gap > 10) {
            const cur = skillGapAggregator.get(g.skillName) || { totalGap: 0, count: 0 };
            cur.totalGap += g.gap;
            cur.count += 1;
            skillGapAggregator.set(g.skillName, cur);
          }
        }
      }

      const readiness = m.career_readiness_score ?? 0;
      members.push({
        memberId: m.member_id,
        userId: m.user_id,
        name: m.name,
        email: m.email,
        department: m.department,
        jobTitle: m.job_title,
        targetCareer: m.target_career || 'Unassigned',
        readinessScore: readiness,
        roadmapCompletionPct: completionPct,
        skillsCount: skills.length,
        topGaps,
        skills,
      });

      const dEntry = deptAggregator.get(m.department) || {
        count: 0,
        readinessSum: 0,
        profSum: 0,
        profCount: 0,
        completionSum: 0,
      };
      dEntry.count += 1;
      dEntry.readinessSum += readiness;
      dEntry.completionSum += completionPct;
      for (const s of skills) {
        dEntry.profSum += s.proficiency;
        dEntry.profCount += 1;
      }
      deptAggregator.set(m.department, dEntry);
    }

    const commonSkillGaps = Array.from(skillGapAggregator.entries())
      .map(([skillName, data]) => ({
        skillName,
        avgGap: Math.round(data.totalGap / data.count),
        affectedCount: data.count,
      }))
      .sort((a, b) => b.affectedCount - a.affectedCount || b.avgGap - a.avgGap)
      .slice(0, 8);

    const departmentMetrics = Array.from(deptAggregator.entries()).map(([department, d]) => ({
      department,
      memberCount: d.count,
      avgReadiness: Math.round(d.readinessSum / Math.max(1, d.count)),
      avgProficiency: Math.round(d.profSum / Math.max(1, d.profCount)),
      completionRate: Math.round(d.completionSum / Math.max(1, d.count)),
    }));

    const overallReadiness =
      members.length > 0 ? Math.round(members.reduce((s, m) => s + m.readinessScore, 0) / members.length) : 0;
    const overallCompletionRate =
      members.length > 0
        ? Math.round(members.reduce((s, m) => s + m.roadmapCompletionPct, 0) / members.length)
        : 0;

    const analytics: OrganizationAnalytics = {
      organization: orgRow,
      members,
      commonSkillGaps,
      departmentMetrics,
      overallReadiness,
      overallCompletionRate,
      groupRecommendations: [],
    };

    res.json(analytics);
  } catch (err) {
    console.error('Org analytics error:', err);
    sendApiError(res, err, 'Failed to load organization analytics.');
  }
});

app.post('/api/organization/members', requireAuth, requireOrgRole, async (req: AuthedRequest, res) => {
  try {
    const admin = req.authUser!;
    const { name, email, department, jobTitle, targetCareer, initialSkills } = req.body as {
      name?: string;
      email?: string;
      department?: string;
      jobTitle?: string;
      targetCareer?: string;
      initialSkills?: string[];
    };

    if (!name?.trim() || !email?.trim() || !department?.trim() || !targetCareer?.trim()) {
      res.status(400).json({ error: 'Name, email, department, and target career are required.' });
      return;
    }

    const orgRow = db
      .prepare('SELECT id FROM organizations WHERE id = ? OR owner_user_id = ? LIMIT 1')
      .get(admin.organizationId, admin.id) as { id: string } | undefined;

    if (!orgRow) {
      res.status(404).json({ error: 'Organization not found.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'A user with this email already exists.' });
      return;
    }

    const newUserId = `user-${crypto.randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, organization_id, onboarding_completed, created_at)
      VALUES (?, ?, ?, ?, 'employee', ?, 1, ?)
    `).run(newUserId, normalizedEmail, hashPassword('Welcome123!'), name.trim(), orgRow.id, now);

    db.prepare(`
      INSERT INTO organization_members (id, organization_id, user_id, department, job_title, joined_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), orgRow.id, newUserId, department.trim(), jobTitle?.trim() || 'Team Member', now);

    db.prepare(`
      INSERT INTO learner_profiles (
        id, user_id, education, experience, current_skill_level, target_career, learning_style,
        weekly_hours, certifications_json, projects_json, interests_json, career_readiness_score, updated_at
      ) VALUES (?, ?, 'Organization Cohort', '', 'Intermediate', ?, 'Mixed Structured', 8, '[]', '[]', '[]', 0, ?)
    `).run(`prof-${crypto.randomUUID().slice(0, 10)}`, newUserId, targetCareer.trim(), now);

    const parsedSkills = (initialSkills && initialSkills.length > 0 ? initialSkills : ['Python', 'SQL']).map(
      (s) => ({ name: s, category: 'Technical' as const })
    );

    await orchestrateOnboardingPipeline({
      userId: newUserId,
      name: name.trim(),
      education: 'Organization Cohort Member',
      experience: jobTitle?.trim() || 'Active Employee',
      currentSkillLevel: 'Intermediate',
      enteredSkills: parsedSkills,
      certifications: [],
      projects: [],
      interests: [targetCareer.trim()],
      targetCareer: targetCareer.trim(),
      learningStyle: 'Mixed Structured',
      weeklyHours: 8,
    });

    res.status(201).json({ success: true, userId: newUserId });
  } catch (err) {
    sendApiError(res, err, 'Failed to add organization member.');
  }
});

app.post('/api/organization/programs', requireAuth, requireOrgRole, async (req: AuthedRequest, res) => {
  try {
    const { organizationName, commonGaps, departmentMetrics } = req.body;
    const programs = await runOrganizationTrainingAgent({
      organizationName: organizationName || 'Organization',
      commonGaps: commonGaps || [],
      departmentMetrics: departmentMetrics || [],
    });
    res.json({ programs });
  } catch (err) {
    sendApiError(res, err, 'Failed to generate cohort training programs.');
  }
});

// ============================================================================
// SETTINGS
// ============================================================================

app.put('/api/settings/account', requireAuth, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  const { name, newPassword } = req.body as { name?: string; newPassword?: string };

  if (name?.trim()) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), user.id);
  }
  if (newPassword && newPassword.length >= 6) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), user.id);
  }

  res.json({ user: getUserById(user.id) });
});

// ============================================================================
// VITE DEV / PRODUCTION STATIC MOUNTING
// ============================================================================

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SkillPath AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
