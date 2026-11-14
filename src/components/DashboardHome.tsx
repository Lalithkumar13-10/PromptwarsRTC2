import React from 'react';
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  MessageSquare,
  Play,
  Target,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardPayload } from '../lib/api';
import type { LearningResource, SkillLevel } from '../types';

interface DashboardHomeProps {
  data: DashboardPayload;
  onNavigate: (tab: string) => void;
  onStartAssessment: (skillName: string, difficulty?: SkillLevel) => void;
  onUpdateModuleStatus: (moduleId: string, status: 'in_progress' | 'completed') => void;
  busyModuleId: string | null;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  data,
  onNavigate,
  onStartAssessment,
  onUpdateModuleStatus,
  busyModuleId,
}) => {
  const { user, profile, skills, gapReport, learningPath, progressHistory, assessmentResults, orchestrationLogs } = data;

  const resources = learningPath?.resources || [];
  const completedCount = resources.filter((r) => r.status === 'completed').length;
  const roadmapPct = resources.length > 0 ? Math.round((completedCount / resources.length) * 100) : 0;
  const readiness = gapReport?.readinessScore ?? profile?.careerReadinessScore ?? 0;

  const upcomingTasks: LearningResource[] = resources
    .filter((r) => r.status === 'in_progress' || r.status === 'not_started')
    .slice(0, 4);

  const weeklyChartData = progressHistory.slice(-7).map((entry) => ({
    date: entry.date.slice(5),
    hours: entry.hoursLogged,
    readiness: entry.readinessSnapshot,
  }));

  const topWeakSkill = gapReport?.gaps.find((g) => g.gap > 0);
  const ringCircumference = 2 * Math.PI * 38;
  const ringOffset = ringCircumference - (readiness / 100) * ringCircumference;

  return (
    <div className="space-y-6">
      {/* Row 1: Bento Student Hero Split (8 cols Dark Indigo Hero + 4 cols AI Mentor Spotlight) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 bg-gradient-to-br from-[#161B29] via-[#1C2237] to-[#2C2668] text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="min-w-0">
              <div className="text-xs font-medium text-indigo-200">
                Active Career Goal · {profile?.learningStyle || 'Adaptive'} · {profile?.weeklyHours || 8} hrs/week
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1.5 text-balance">
                Welcome back, {user.name}
              </h1>
              <p className="text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
                Target Role: <span className="font-semibold text-white">{profile?.targetCareer || 'Not selected'}</span>.{' '}
                {learningPath?.strategySummary || 'Your personalized agentic learning roadmap is ready.'}
              </p>
            </div>

            {/* Radial Readiness Ring */}
            <div className="shrink-0 flex items-center gap-4 sm:flex-col sm:text-center bg-white/10 rounded-2xl px-5 py-4">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="38" stroke="rgba(255,255,255,0.16)" strokeWidth="7" fill="none" />
                  <circle
                    cx="48"
                    cy="48"
                    r="38"
                    stroke="#8B82FF"
                    strokeWidth="7"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono tabular-nums text-xl font-bold text-white">{readiness}%</span>
                </div>
              </div>
              <div className="text-xs font-medium text-indigo-200 whitespace-nowrap">Career Readiness</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('roadmap')}
              className="px-4 py-2.5 text-xs font-semibold text-slate-900 bg-white hover:bg-indigo-50 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 text-[#5B4FE9]" />
              Continue Roadmap
            </button>
            <button
              type="button"
              onClick={() => onNavigate('mentor')}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4 text-indigo-200" />
              Ask AI Mentor
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5B4FE9]">Agent 5 · AI Career Mentor</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#5B4FE9] flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900 mt-3">Need help bridging a skill gap?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Your mentor tracks your {readiness}% readiness for {profile?.targetCareer} and can break down tough topics or suggest alternative exercises.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('mentor')}
              className="flex-1 px-4 py-2.5 bg-[#5B4FE9] hover:bg-[#4B3FD6] text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap text-center"
            >
              Open Mentor Chat
            </button>
            <button
              type="button"
              onClick={() => onNavigate('careers')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
            >
              Explore Career Roles
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: 4-Column LMS KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-medium text-slate-500">Career Readiness</div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-3xl font-bold text-slate-900">{readiness}%</span>
            <span className="text-xs font-semibold text-[#5B4FE9] truncate">{profile?.targetCareer || 'Target'}</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-[#5B4FE9] rounded-full transition-all duration-300" style={{ width: `${readiness}%` }} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-medium text-slate-500">Skills Assessed</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono tabular-nums text-3xl font-bold text-slate-900">{skills.length}</span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {gapReport?.skillsMastered ?? 0} mastered · {gapReport?.skillsNeedingImprovement ?? 0} focus
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => onNavigate('skills')}
              className="text-[#5B4FE9] hover:text-[#4B3FD6] font-semibold inline-flex items-center gap-1 whitespace-nowrap"
            >
              Inspect gap matrix <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-medium text-slate-500">Roadmap Completion</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono tabular-nums text-3xl font-bold text-slate-900">{roadmapPct}%</span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {completedCount}/{resources.length} modules
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${roadmapPct}%` }} />
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5">
          <div className="text-xs font-medium text-amber-800">Priority Skill Gap</div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-lg font-bold text-slate-900 truncate">
              {topWeakSkill ? topWeakSkill.skillName : 'All Targets Met'}
            </span>
            {topWeakSkill && (
              <span className="font-mono tabular-nums text-sm font-bold text-amber-700 shrink-0">
                -{topWeakSkill.gap} pts
              </span>
            )}
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() =>
                onStartAssessment(topWeakSkill?.skillName || skills[0]?.name || 'Python', 'Intermediate')
              }
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 inline-flex items-center gap-1 whitespace-nowrap"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              Run skill assessment
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Main LMS Workspace (Left 7 cols Tasks + Weekly Study Curve | Right 5 cols Assessments + Agent Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">Upcoming Learning Tasks</h2>
                <p className="text-xs text-slate-500">Sequenced by the Learning Path Recommendation Agent</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('roadmap')}
                className="text-xs font-semibold text-[#5B4FE9] hover:text-[#4B3FD6] whitespace-nowrap"
              >
                View all modules
              </button>
            </div>

            <div className="space-y-3">
              {upcomingTasks.map((mod, idx) => (
                <div
                  key={mod.id}
                  className="p-3.5 rounded-2xl bg-[#F8F9FC] hover:bg-indigo-50/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 font-mono tabular-nums text-xs font-bold text-[#5B4FE9] flex items-center justify-center shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500">
                        {mod.phase} · {mod.skillName} · <span className="font-mono tabular-nums">{mod.estimatedHours}h</span>
                        {mod.isRemedial ? ' · Adaptive Remedial' : ''}
                      </div>
                      <div className="text-sm font-semibold text-slate-900 mt-0.5 truncate">{mod.title}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {mod.status === 'not_started' && (
                      <button
                        type="button"
                        disabled={busyModuleId === mod.id}
                        onClick={() => onUpdateModuleStatus(mod.id, 'in_progress')}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <Play className="w-3 h-3" /> Start
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyModuleId === mod.id}
                      onClick={() => onUpdateModuleStatus(mod.id, 'completed')}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#5B4FE9] hover:bg-[#4B3FD6] disabled:opacity-50 rounded-xl inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {busyModuleId === mod.id ? 'Updating...' : 'Complete'}
                    </button>
                  </div>
                </div>
              ))}
              {upcomingTasks.length === 0 && (
                <div className="py-6 text-center text-sm text-slate-500">
                  All modules in your current roadmap are completed! Explore a next-level career role or run an advanced assessment.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">Weekly Learning Activity</h2>
                <p className="text-xs text-slate-500">Study hours logged across recent sessions</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('analytics')}
                className="text-xs font-semibold text-[#5B4FE9] hover:text-[#4B3FD6] whitespace-nowrap"
              >
                Full analytics
              </button>
            </div>

            {weeklyChartData.length > 0 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="lmsHoursFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5B4FE9" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#5B4FE9" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      name="Hours Logged"
                      stroke="#5B4FE9"
                      strokeWidth={2.5}
                      fill="url(#lmsHoursFill)"
                      dot={{ r: 3.5, fill: '#5B4FE9' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-2xl p-6">
                <p className="text-sm text-slate-600">No learning sessions logged yet.</p>
                <button
                  type="button"
                  onClick={() => onNavigate('roadmap')}
                  className="mt-2 text-xs font-semibold text-[#5B4FE9] hover:underline"
                >
                  Start your first roadmap module
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-bold text-slate-900">Recent Assessments</h2>
              <button
                type="button"
                onClick={() => onNavigate('assessments')}
                className="text-xs font-semibold text-[#5B4FE9] hover:text-[#4B3FD6] whitespace-nowrap"
              >
                Take quiz
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {assessmentResults.slice(0, 4).map((r) => (
                <div key={r.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{r.skillName}</div>
                      <div className="text-xs text-slate-500">
                        {r.difficulty} · {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`font-mono tabular-nums text-sm font-bold ${
                          r.score >= 80 ? 'text-emerald-600' : r.score >= 55 ? 'text-[#5B4FE9]' : 'text-amber-600'
                        }`}
                      >
                        {r.score}%
                      </div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        {r.correctCount}/{r.totalCount}
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        r.score >= 80 ? 'bg-emerald-500' : r.score >= 55 ? 'bg-[#5B4FE9]' : 'bg-amber-500'
                      }`}
                      style={{ width: `${r.score}%` }}
                    />
                  </div>
                </div>
              ))}
              {assessmentResults.length === 0 && (
                <div className="py-4 text-xs text-slate-500">
                  No assessments taken yet. Run a diagnostic in the Assessments tab.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6">
            <h2 className="font-display text-base font-bold text-slate-900 mb-4">
              Adaptive Agent Orchestration
            </h2>
            <div className="space-y-4">
              {orchestrationLogs.slice(0, 3).map((log, idx) => (
                <div key={log.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#5B4FE9] font-mono tabular-nums text-[11px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    {idx < Math.min(orchestrationLogs.length, 3) - 1 && (
                      <div className="w-px flex-1 bg-slate-200 my-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">{log.triggerEvent}</span>
                      <span className="font-mono tabular-nums text-xs font-semibold text-[#5B4FE9] shrink-0">
                        {log.beforeReadiness}% → {log.afterReadiness}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{log.resolutionSummary}</p>
                    <div className="text-[11px] text-slate-400 mt-1">{log.agentsInvoked.join(' · ')}</div>
                  </div>
                </div>
              ))}
              {orchestrationLogs.length === 0 && (
                <div className="py-3 text-xs text-slate-500">
                  Orchestrator updates appear here whenever you complete a module, assessment, or career switch.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
