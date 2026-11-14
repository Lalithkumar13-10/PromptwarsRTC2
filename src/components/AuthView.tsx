import React, { useState } from 'react';
import { ArrowRight, BookOpen, Building2, Compass, Layers, ShieldCheck, UserCheck } from 'lucide-react';
import { api, setStoredToken } from '../lib/api';
import type { User, UserRole } from '../types';

interface AuthViewProps {
  onAuthenticated: (user: User) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState<'Enterprise' | 'University'>('Enterprise');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        setStoredToken(res.token);
        onAuthenticated(res.user);
      } else {
        const res = await api.signup({
          name,
          email,
          password,
          role,
          organizationName: role === 'organization' ? orgName : undefined,
          organizationType: role === 'organization' ? orgType : undefined,
        });
        setStoredToken(res.token);
        onAuthenticated(res.user);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loginDemo(demoEmail: string) {
    setError('');
    setLoading(true);
    try {
      const res = await api.login({ email: demoEmail, password: 'DemoPass123!' });
      setStoredToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB] text-slate-900 flex flex-col">
      {/* Compact Top Navigation Bar */}
      <header className="bg-[#131720] text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between gap-8">
          <a href="#login-window" className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <div className="w-8 h-8 rounded-xl bg-[#5B4FE9] flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">SkillPath AI</span>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
            <a href="#login-window" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Sign In
            </a>
            <a href="#platform-overview" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Platform
            </a>
            <a href="#capabilities" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Capabilities
            </a>
            <a href="#demo-accounts" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Demo Access
            </a>
          </nav>

          <button
            type="button"
            disabled={loading}
            onClick={() => loginDemo('alex.student@skillpath.ai')}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#5B4FE9] hover:bg-[#4B3FD6] disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            {loading ? 'Signing in...' : 'Student Demo'}
          </button>
        </div>
      </header>

      {/* FIRST SECTION: Login Window & Quick Demonstration Access */}
      <section id="login-window" className="px-6 sm:px-8 py-10 sm:py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Primary Login / Sign Up Window */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-7 sm:p-8">
            <div className="mb-6">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {mode === 'login' ? 'Sign in to your workspace' : 'Create your learner account'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                {mode === 'login'
                  ? 'Access your personalized roadmap, assessments, and AI mentor.'
                  : 'Start with a guided multi-agent skill diagnostic.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  mode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jordan Taylor"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account Role</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['student', 'employee', 'organization'] as UserRole[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`py-2 px-2.5 text-xs font-semibold rounded-xl border transition-colors capitalize ${
                            role === r
                              ? 'border-[#5B4FE9] bg-indigo-50 text-[#5B4FE9]'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {role === 'organization' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Organization Name</label>
                        <input
                          type="text"
                          required
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          placeholder="Horizon University"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type</label>
                        <select
                          value={orgType}
                          onChange={(e) => setOrgType(e.target.value as 'Enterprise' | 'University')}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50"
                        >
                          <option value="Enterprise">Enterprise</option>
                          <option value="University">University</option>
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#5B4FE9] hover:bg-[#4B3FD6] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account & Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Demonstration Accounts Quick Access */}
          <div id="demo-accounts" className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7">
            <div className="text-sm font-display font-bold text-slate-900">
              Demonstration Accounts
            </div>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Explore pre-populated learner and organization workspaces with one click.
            </p>
            <div className="divide-y divide-slate-100">
              <button
                type="button"
                disabled={loading}
                onClick={() => loginDemo('alex.student@skillpath.ai')}
                className="w-full text-left py-3.5 first:pt-1 hover:bg-slate-50 px-2.5 rounded-xl transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#5B4FE9] flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">Alex Rivera</div>
                    <div className="text-xs text-slate-500 truncate">
                      Student · AI Engineer Track · 62% Readiness
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#5B4FE9] whitespace-nowrap shrink-0">
                  Sign in
                </span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => loginDemo('elena.org@skillpath.ai')}
                className="w-full text-left py-3.5 last:pb-1 hover:bg-slate-50 px-2.5 rounded-xl transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">Elena Vance</div>
                    <div className="text-xs text-slate-500 truncate">
                      Organization Admin · Apex Tech Academy (6 Members)
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#5B4FE9] whitespace-nowrap shrink-0">
                  Sign in
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECOND SECTION BELOW: SkillPath AI Platform Content */}
      <section id="platform-overview" className="flex-1 bg-[#131720] text-white px-6 sm:px-8 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            <div className="lg:col-span-6">
              <div className="text-xs font-semibold text-[#9C94FF] tracking-wide">
                Agentic Learning Management Platform
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white mt-3 text-balance leading-[1.15]">
                Adaptive career intelligence powered by six specialized AI agents.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
                SkillPath AI analyzes your real capabilities, maps exact gaps against target roles, builds a dynamic learning roadmap, and recalibrates automatically as you progress.
              </p>
            </div>

            <div id="capabilities" className="lg:col-span-6 divide-y divide-white/10">
              <div className="py-4 first:pt-0 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-[#5B4FE9]/20 text-[#9C94FF] flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    01. Skill Assessment &amp; Gap Intelligence
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                    Calibrated 0–100 proficiency scoring with dynamic multiple-choice and applied coding evaluations.
                  </p>
                </div>
              </div>

              <div className="py-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    02. Closed-Loop Adaptive Orchestration
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                    Automatically inserts remedial tutorials when you struggle and fast-tracks mastered modules when you excel.
                  </p>
                </div>
              </div>

              <div className="py-4 last:pb-0 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    03. Individual &amp; Organization Ready
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                    Built for students, professionals, universities, and enterprise engineering cohorts.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <span>SkillPath AI · Agentic Learning Engine</span>
            <span>6 Specialized Agents</span>
          </div>
        </div>
      </section>
    </div>
  );
};
