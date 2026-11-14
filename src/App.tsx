import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ClipboardCheck,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Target,
  User as UserIcon,
  X,
} from 'lucide-react';
import { AIMentorView } from './components/AIMentorView';
import { AssessmentsView } from './components/AssessmentsView';
import { AuthView } from './components/AuthView';
import { CareerExplorerView } from './components/CareerExplorerView';
import { DashboardHome } from './components/DashboardHome';
import { LearningRoadmapView } from './components/LearningRoadmapView';
import { OnboardingWizard } from './components/OnboardingWizard';
import { OrganizationDashboardView } from './components/OrganizationDashboardView';
import { NotificationsView, ProfileView, SettingsView } from './components/ProfileAndSettingsViews';
import { ProgressAnalyticsView } from './components/ProgressAnalyticsView';
import { SkillAnalysisView } from './components/SkillAnalysisView';
import { api, type DashboardPayload, getStoredToken, setStoredToken } from './lib/api';
import type { SkillLevel, User } from './types';

type TabId =
  | 'dashboard'
  | 'profile'
  | 'skills'
  | 'careers'
  | 'roadmap'
  | 'assessments'
  | 'mentor'
  | 'analytics'
  | 'notifications'
  | 'organization'
  | 'settings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loadingDash, setLoadingDash] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [busyModuleId, setBusyModuleId] = useState<string | null>(null);
  const [switchingCareer, setSwitchingCareer] = useState(false);
  const [regeneratingRoadmap, setRegeneratingRoadmap] = useState(false);

  const [assessmentSeed, setAssessmentSeed] = useState<{ skill?: string; difficulty?: SkillLevel }>({});
  const [mentorInitialPrompt, setMentorInitialPrompt] = useState<string>('');
  const [bannerMessage, setBannerMessage] = useState<{ text: string; tone: 'info' | 'error' } | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoadingDash(true);
    try {
      const data = await api.getDashboard();
      setDashboard(data);
      setUser(data.user);
    } catch (err) {
      setBannerMessage({ text: (err as Error).message, tone: 'error' });
    } finally {
      setLoadingDash(false);
    }
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setCheckingAuth(false);
      return;
    }
    api
      .me()
      .then((res) => {
        setUser(res.user);
        if (res.user.role === 'organization') {
          setActiveTab('organization');
        }
        if (res.user.onboardingCompleted) {
          loadDashboard();
        }
      })
      .catch(() => {
        setStoredToken(null);
      })
      .finally(() => setCheckingAuth(false));
  }, [loadDashboard]);

  function handleAuthenticated(authedUser: User) {
    setUser(authedUser);
    if (authedUser.role === 'organization') {
      setActiveTab('organization');
    } else {
      setActiveTab('dashboard');
    }
    if (authedUser.onboardingCompleted) {
      loadDashboard();
    }
  }

  function handleLogout() {
    setStoredToken(null);
    setUser(null);
    setDashboard(null);
    setActiveTab('dashboard');
  }

  async function handleUpdateModuleStatus(moduleId: string, status: 'in_progress' | 'completed') {
    setBusyModuleId(moduleId);
    setBannerMessage(null);
    try {
      const res = await api.updateModuleStatus(moduleId, status);
      await loadDashboard();
      if (status === 'completed' && !res.alreadyCompleted) {
        setBannerMessage({
          tone: 'info',
          text: `Module completed: "${res.completedModuleTitle}". Readiness updated (${res.beforeReadiness}% → ${res.afterReadiness}%)${
            res.unlockedModuleTitle ? ` and "${res.unlockedModuleTitle}" unlocked` : ''
          }.`,
        });
      }
    } catch (err) {
      setBannerMessage({ text: (err as Error).message, tone: 'error' });
    } finally {
      setBusyModuleId(null);
    }
  }

  async function handleSwitchCareer(newCareerTitle: string) {
    setSwitchingCareer(true);
    setBannerMessage(null);
    try {
      const res = await api.selectCareer(newCareerTitle);
      await loadDashboard();
      setActiveTab('roadmap');
      setBannerMessage({
        tone: 'info',
        text: `${res.orchestratorNote} New readiness: ${res.readinessScore}%.`,
      });
    } catch (err) {
      setBannerMessage({ text: (err as Error).message, tone: 'error' });
    } finally {
      setSwitchingCareer(false);
    }
  }

  async function handleRegenerateRoadmap() {
    setRegeneratingRoadmap(true);
    setBannerMessage(null);
    try {
      const res = await api.regenerateRoadmap();
      await loadDashboard();
      setBannerMessage({ tone: 'info', text: res.orchestratorNote });
    } catch (err) {
      setBannerMessage({ text: (err as Error).message, tone: 'error' });
    } finally {
      setRegeneratingRoadmap(false);
    }
  }

  function handleStartAssessment(skillName: string, difficulty: SkillLevel = 'Intermediate') {
    setAssessmentSeed({ skill: skillName, difficulty });
    setActiveTab('assessments');
  }

  function handleAskMentor(prompt: string) {
    setMentorInitialPrompt(prompt);
    setActiveTab('mentor');
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center text-sm text-slate-500">
        Loading SkillPath AI workspace...
      </div>
    );
  }

  if (!user) {
    return <AuthView onAuthenticated={handleAuthenticated} />;
  }

  if (!user.onboardingCompleted) {
    return (
      <OnboardingWizard
        user={user}
        onCompleted={(updated) => {
          setUser(updated);
          loadDashboard();
        }}
      />
    );
  }

  const unreadCount = dashboard?.notifications.filter((n) => !n.isRead).length || 0;

  const navItems: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number; group: 'Overview' | 'Learning' | 'Account' }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
    ...(user.role === 'organization'
      ? [{ id: 'organization' as TabId, label: 'Organization Dashboard', icon: Building2, group: 'Overview' as const }]
      : []),
    { id: 'roadmap', label: 'Learning Roadmap', icon: BookOpen, group: 'Learning' },
    { id: 'skills', label: 'Skill Analysis', icon: Target, group: 'Learning' },
    { id: 'careers', label: 'Career Explorer', icon: Compass, group: 'Learning' },
    { id: 'assessments', label: 'Assessments', icon: ClipboardCheck, group: 'Learning' },
    { id: 'mentor', label: 'AI Mentor', icon: MessageSquare, group: 'Learning' },
    { id: 'analytics', label: 'Progress Analytics', icon: BarChart3, group: 'Learning' },
    { id: 'profile', label: 'My Profile', icon: UserIcon, group: 'Account' },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount, group: 'Account' },
    { id: 'settings', label: 'Settings', icon: Settings, group: 'Account' },
  ];

  const activeNavLabel = navItems.find((n) => n.id === activeTab)?.label || 'Dashboard';
  const groups: ('Overview' | 'Learning' | 'Account')[] = ['Overview', 'Learning', 'Account'];

  return (
    <div className="min-h-screen bg-[#F6F7FB] text-slate-900 flex">
      {/* Mobile Drawer Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Left Deep-Obsidian Student LMS Sidebar */}
      <aside
        className={`fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-50 w-64 shrink-0 bg-[#131720] text-slate-300 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          <div className="h-16 px-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#5B4FE9] flex items-center justify-center shrink-0">
                <Compass className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-base font-bold text-white tracking-tight whitespace-nowrap">
                SkillPath AI
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="px-3 py-4 space-y-5">
            {groups.map((grp) => {
              const items = navItems.filter((i) => i.group === grp);
              if (items.length === 0) return null;
              return (
                <div key={grp}>
                  <div className="px-3 mb-2 text-[11px] font-medium text-slate-500">{grp}</div>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const active = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileNavOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                            active
                              ? 'bg-[#5B4FE9] text-white'
                              : 'text-slate-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-3 truncate">
                            <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                            <span className="truncate">{item.label}</span>
                          </span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span
                              className={`font-mono tabular-nums text-[11px] font-semibold ${
                                active ? 'text-indigo-100' : 'text-[#8B82FF]'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#5B4FE9] text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
                {user.name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                <div className="text-[11px] text-slate-400 capitalize truncate">
                  {user.role} · {dashboard?.profile?.targetCareer || 'Member'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/10 shrink-0 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top LMS Utility Bar */}
        <header className="h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-xs text-slate-500 truncate">
              SkillPath AI <span className="mx-1.5 text-slate-300">/</span>{' '}
              <span className="font-display text-sm font-bold text-slate-900">{activeNavLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {dashboard?.profile?.targetCareer && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap pr-2">
                <span>Readiness</span>
                <span className="font-mono tabular-nums font-bold text-[#5B4FE9]">
                  {dashboard.gapReport?.readinessScore ?? dashboard.profile.careerReadinessScore}%
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className="relative p-2 text-slate-500 hover:text-slate-900 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#5B4FE9] text-white font-mono text-[10px] flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assessments')}
              className="px-4 py-2 bg-[#5B4FE9] hover:bg-[#4B3FD6] text-white text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 transition-colors"
            >
              New Assessment
            </button>
          </div>
        </header>

        {/* Workspace Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {bannerMessage && (
            <div
              className={`mb-6 p-4 rounded-2xl border flex items-center justify-between gap-4 text-xs font-medium ${
                bannerMessage.tone === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-950'
              }`}
            >
              <span>{bannerMessage.text}</span>
              <button
                type="button"
                onClick={() => setBannerMessage(null)}
                className="text-slate-500 hover:text-slate-900 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loadingDash && !dashboard ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-sm text-slate-500">
              Synchronizing multi-agent learner workspace...
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && dashboard && (
                <DashboardHome
                  data={dashboard}
                  onNavigate={(tab) => setActiveTab(tab as TabId)}
                  onStartAssessment={handleStartAssessment}
                  onUpdateModuleStatus={handleUpdateModuleStatus}
                  busyModuleId={busyModuleId}
                />
              )}

              {activeTab === 'profile' && dashboard && (
                <ProfileView
                  user={user}
                  profile={dashboard.profile}
                  skills={dashboard.skills}
                  onRefresh={loadDashboard}
                />
              )}

              {activeTab === 'skills' && dashboard && (
                <SkillAnalysisView data={dashboard} onStartAssessment={handleStartAssessment} />
              )}

              {activeTab === 'careers' && dashboard && (
                <CareerExplorerView
                  currentTargetCareer={dashboard.profile?.targetCareer || ''}
                  userSkills={dashboard.skills}
                  onSwitchCareer={handleSwitchCareer}
                  switching={switchingCareer}
                />
              )}

              {activeTab === 'roadmap' && dashboard && (
                <LearningRoadmapView
                  learningPath={dashboard.learningPath}
                  onUpdateStatus={handleUpdateModuleStatus}
                  onRegenerate={handleRegenerateRoadmap}
                  onTakeAssessment={handleStartAssessment}
                  onAskMentor={handleAskMentor}
                  busyModuleId={busyModuleId}
                  regenerating={regeneratingRoadmap}
                />
              )}

              {activeTab === 'assessments' && dashboard && (
                <AssessmentsView
                  skills={dashboard.skills}
                  gaps={dashboard.gapReport?.gaps || []}
                  results={dashboard.assessmentResults}
                  preselectedSkill={assessmentSeed.skill}
                  preselectedDifficulty={assessmentSeed.difficulty}
                  onAssessmentCompleted={loadDashboard}
                  onNavigate={(tab) => setActiveTab(tab as TabId)}
                />
              )}

              {activeTab === 'mentor' && dashboard && (
                <AIMentorView
                  profile={dashboard.profile}
                  skills={dashboard.skills}
                  initialPrompt={mentorInitialPrompt}
                  onClearInitialPrompt={() => setMentorInitialPrompt('')}
                />
              )}

              {activeTab === 'analytics' && dashboard && <ProgressAnalyticsView data={dashboard} />}

              {activeTab === 'notifications' && dashboard && (
                <NotificationsView
                  notifications={dashboard.notifications}
                  onRefresh={loadDashboard}
                  onNavigate={(tab) => setActiveTab(tab as TabId)}
                />
              )}

              {activeTab === 'organization' && user.role === 'organization' && <OrganizationDashboardView />}

              {activeTab === 'settings' && (
                <SettingsView user={user} onUserUpdated={(u) => setUser(u)} onLogout={handleLogout} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
