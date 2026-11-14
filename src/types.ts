export type UserRole = 'student' | 'employee' | 'organization';
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type SkillCategory = 'Technical' | 'Soft';
export type LearningStyle = 'Hands-on Projects' | 'Visual & Video' | 'Reading & Docs' | 'Mixed Structured';
export type ResourceType = 'Course' | 'Documentation' | 'Tutorial' | 'Project';
export type ModuleStatus = 'locked' | 'not_started' | 'in_progress' | 'completed';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string | null;
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface LearnerProfile {
  id: string;
  userId: string;
  education: string;
  experience: string;
  currentSkillLevel: SkillLevel;
  targetCareer: string;
  learningStyle: LearningStyle;
  weeklyHours: number;
  certifications: string[];
  projects: { title: string; description: string; technologies: string[] }[];
  interests: string[];
  careerReadinessScore: number;
  lastAnalyzedAt: string | null;
  updatedAt: string;
}

export interface Skill {
  id: string;
  userId: string;
  name: string;
  category: SkillCategory;
  proficiency: number; // 0-100
  level: SkillLevel;
  source: 'profile' | 'assessment' | 'module';
  isStrength: boolean;
  isWeakness: boolean;
  updatedAt: string;
}

export interface CareerRequiredSkill {
  name: string;
  category: SkillCategory;
  requiredLevel: number;
  priority: 'Critical' | 'High' | 'Medium';
  description: string;
}

export interface CareerRole {
  id: string;
  title: string;
  domain: string;
  description: string;
  requiredSkills: CareerRequiredSkill[];
  avgSalaryRange: string;
  demandLevel: string;
}

export interface SkillGapItem {
  skillName: string;
  category: SkillCategory;
  currentLevel: number;
  requiredLevel: number;
  gap: number;
  priority: 'Critical' | 'High' | 'Medium';
  status: 'Mastered' | 'On Track' | 'Needs Focus' | 'Critical Gap';
  description: string;
}

export interface SkillAnalysisReport {
  targetCareer: string;
  readinessScore: number;
  totalAssessed: number;
  skillsMastered: number;
  skillsNeedingImprovement: number;
  strengths: string[];
  weaknesses: string[];
  gaps: SkillGapItem[];
  executiveSummary: string;
}

export interface AssessmentQuestion {
  id: string;
  type: 'mcq' | 'descriptive';
  prompt: string;
  codeSnippet?: string;
  options?: string[];
  correctOptionIndex?: number;
  topic: string;
  explanation?: string;
}

export interface SkillAssessment {
  id: string;
  userId: string;
  skillName: string;
  difficulty: SkillLevel;
  questions: AssessmentQuestion[];
  status: 'pending' | 'completed';
  createdAt: string;
}

export interface QuestionFeedback {
  questionId: string;
  topic: string;
  isCorrect: boolean;
  score: number;
  feedback: string;
  correctAnswerSummary: string;
}

export interface AssessmentResult {
  id: string;
  assessmentId: string;
  userId: string;
  skillName: string;
  difficulty: SkillLevel;
  score: number;
  correctCount: number;
  totalCount: number;
  feedback: QuestionFeedback[];
  weakTopics: string[];
  strongTopics: string[];
  aiEvaluationSummary: string;
  createdAt: string;
}

export interface LearningResource {
  id: string;
  learningPathId: string;
  userId: string;
  phase: SkillLevel;
  orderIndex: number;
  skillName: string;
  title: string;
  resourceType: ResourceType;
  url: string;
  provider: string;
  learningObjectives: string[];
  practicalExercise: string;
  expectedOutcome: string;
  estimatedHours: number;
  difficulty: SkillLevel;
  status: ModuleStatus;
  isRemedial: boolean;
  completedAt: string | null;
}

export interface LearningPath {
  id: string;
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
  resources: LearningResource[];
  createdAt: string;
  updatedAt: string;
}

export interface ProgressEntry {
  id: string;
  userId: string;
  date: string;
  hoursLogged: number;
  modulesCompleted: number;
  assessmentsTaken: number;
  readinessSnapshot: number;
  eventType: string;
  eventDescription: string;
  createdAt: string;
}

export interface MentorMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  suggestedActions: string[];
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'resource' | 'assessment' | 'milestone' | 'warning' | 'roadmap' | 'career' | 'summary';
  title: string;
  message: string;
  isRead: boolean;
  actionTab: string | null;
  createdAt: string;
}

export interface OrchestrationLog {
  id: string;
  userId: string;
  triggerEvent: string;
  agentsInvoked: string[];
  resolutionSummary: string;
  beforeReadiness: number;
  afterReadiness: number;
  createdAt: string;
}

export interface OrganizationMemberSummary {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  department: string;
  jobTitle: string;
  targetCareer: string;
  readinessScore: number;
  roadmapCompletionPct: number;
  skillsCount: number;
  topGaps: { skillName: string; gap: number; priority: string }[];
  skills: Skill[];
}

export interface OrganizationAnalytics {
  organization: {
    id: string;
    name: string;
    type: 'University' | 'Enterprise';
    industry: string;
  };
  members: OrganizationMemberSummary[];
  commonSkillGaps: { skillName: string; avgGap: number; affectedCount: number }[];
  departmentMetrics: {
    department: string;
    memberCount: number;
    avgReadiness: number;
    avgProficiency: number;
    completionRate: number;
  }[];
  overallReadiness: number;
  overallCompletionRate: number;
  groupRecommendations: {
    title: string;
    targetDepartment: string;
    targetSkills: string[];
    rationale: string;
    estimatedWeeks: number;
  }[];
}
