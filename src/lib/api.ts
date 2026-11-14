import type {
  AppNotification,
  AssessmentResult,
  CareerRole,
  LearnerProfile,
  LearningPath,
  MentorMessage,
  OrchestrationLog,
  OrganizationAnalytics,
  ProgressEntry,
  Skill,
  SkillAnalysisReport,
  SkillAssessment,
  SkillLevel,
  User,
  UserRole,
} from '../types';

const TOKEN_STORAGE_KEY = 'skillpath_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export interface DashboardPayload {
  user: User;
  profile: LearnerProfile | null;
  skills: Skill[];
  gapReport: SkillAnalysisReport | null;
  learningPath: LearningPath | null;
  progressHistory: ProgressEntry[];
  assessmentResults: AssessmentResult[];
  notifications: AppNotification[];
  orchestrationLogs: OrchestrationLog[];
}

export const api = {
  signup: (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    organizationName?: string;
    organizationType?: 'University' | 'Enterprise';
  }) => apiRequest<{ token: string; user: User }>('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload: { email: string; password: string }) =>
    apiRequest<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  me: () => apiRequest<{ user: User }>('/api/auth/me'),

  completeOnboarding: (payload: {
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
  }) =>
    apiRequest<{ user: User; readinessScore: number; gapReport: SkillAnalysisReport }>('/api/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getDashboard: () => apiRequest<DashboardPayload>('/api/dashboard'),

  updateProfile: (payload: Record<string, unknown>) =>
    apiRequest<{ user: User; careerChanged: boolean; careerAdaptation: unknown }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  upsertSkill: (payload: { name: string; category: 'Technical' | 'Soft'; proficiency: number }) =>
    apiRequest<{ success: boolean }>('/api/skills', { method: 'POST', body: JSON.stringify(payload) }),

  deleteSkill: (id: string) => apiRequest<{ success: boolean }>(`/api/skills/${id}`, { method: 'DELETE' }),

  getCareers: () => apiRequest<{ roles: CareerRole[] }>('/api/careers'),

  selectCareer: (targetCareer: string) =>
    apiRequest<{
      newTargetCareer: string;
      readinessScore: number;
      gapReport: SkillAnalysisReport;
      orchestratorNote: string;
    }>('/api/careers/select', { method: 'POST', body: JSON.stringify({ targetCareer }) }),

  updateModuleStatus: (moduleId: string, status: 'in_progress' | 'completed' | 'not_started') =>
    apiRequest<{
      success?: boolean;
      alreadyCompleted?: boolean;
      completedModuleTitle?: string;
      unlockedModuleTitle?: string | null;
      skillName?: string;
      recommendedDifficulty?: SkillLevel;
      beforeReadiness?: number;
      afterReadiness?: number;
    }>(`/api/roadmap/modules/${moduleId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  regenerateRoadmap: () =>
    apiRequest<{ readinessScore: number; orchestratorNote: string }>('/api/roadmap/regenerate', {
      method: 'POST',
    }),

  generateAssessment: (payload: { skillName: string; difficulty: SkillLevel; weakTopics?: string[] }) =>
    apiRequest<{ assessment: SkillAssessment }>('/api/assessments/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitAssessment: (assessmentId: string, answers: Record<string, string | number>) =>
    apiRequest<{
      result: AssessmentResult;
      adaptation: {
        performanceBand: 'poor' | 'steady' | 'strong';
        newProficiency: number;
        adaptationAction: string;
        adaptationSummary: string;
        beforeReadiness: number;
        afterReadiness: number;
      };
    }>(`/api/assessments/${assessmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  getMentorMessages: () => apiRequest<{ messages: MentorMessage[] }>('/api/mentor/messages'),

  sendMentorMessage: (message: string) =>
    apiRequest<{ userMessage: MentorMessage; assistantMessage: MentorMessage }>('/api/mentor/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  markNotificationRead: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'PATCH' }),

  markAllNotificationsRead: () =>
    apiRequest<{ success: boolean }>('/api/notifications/read-all', { method: 'POST' }),

  getOrganizationAnalytics: () => apiRequest<OrganizationAnalytics>('/api/organization/analytics'),

  addOrganizationMember: (payload: {
    name: string;
    email: string;
    department: string;
    jobTitle: string;
    targetCareer: string;
    initialSkills: string[];
  }) => apiRequest<{ success: boolean; userId: string }>('/api/organization/members', { method: 'POST', body: JSON.stringify(payload) }),

  generateOrganizationPrograms: (payload: {
    organizationName: string;
    commonGaps: OrganizationAnalytics['commonSkillGaps'];
    departmentMetrics: OrganizationAnalytics['departmentMetrics'];
  }) =>
    apiRequest<{ programs: OrganizationAnalytics['groupRecommendations'] }>('/api/organization/programs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAccountSettings: (payload: { name?: string; newPassword?: string }) =>
    apiRequest<{ user: User }>('/api/settings/account', { method: 'PUT', body: JSON.stringify(payload) }),
};
