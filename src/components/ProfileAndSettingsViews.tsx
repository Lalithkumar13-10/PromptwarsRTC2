import React, { useState } from 'react';
import { Bell, Check, Plus, Save, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import type { AppNotification, LearnerProfile, LearningStyle, Skill, SkillLevel, User } from '../types';

// ============================================================================
// MY PROFILE VIEW
// ============================================================================

interface ProfileViewProps {
  user: User;
  profile: LearnerProfile | null;
  skills: Skill[];
  onRefresh: () => Promise<void>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, profile, skills, onRefresh }) => {
  const [name, setName] = useState(user.name);
  const [education, setEducation] = useState(profile?.education || '');
  const [experience, setExperience] = useState(profile?.experience || '');
  const [currentSkillLevel, setCurrentSkillLevel] = useState<SkillLevel>(profile?.currentSkillLevel || 'Intermediate');
  const [targetCareer, setTargetCareer] = useState(profile?.targetCareer || '');
  const [learningStyle, setLearningStyle] = useState<LearningStyle>(profile?.learningStyle || 'Mixed Structured');
  const [weeklyHours, setWeeklyHours] = useState(profile?.weeklyHours || 8);
  const [certifications, setCertifications] = useState<string[]>(profile?.certifications || []);
  const [certInput, setCertInput] = useState('');
  const [interests, setInterests] = useState<string[]>(profile?.interests || []);
  const [interestInput, setInterestInput] = useState('');

  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCat, setNewSkillCat] = useState<'Technical' | 'Soft'>('Technical');
  const [newSkillProf, setNewSkillProf] = useState(60);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg('');
    setError('');
    try {
      const res = await api.updateProfile({
        name,
        education,
        experience,
        currentSkillLevel,
        targetCareer,
        learningStyle,
        weeklyHours,
        certifications,
        interests,
      });
      await onRefresh();
      setStatusMsg(
        res.careerChanged
          ? 'Profile updated and Career Intelligence + Roadmap Agents adapted your learning path to the new career goal.'
          : 'Learner profile saved successfully.'
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSkill(e: React.FormEvent) {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    setError('');
    try {
      await api.upsertSkill({ name: newSkillName.trim(), category: newSkillCat, proficiency: newSkillProf });
      setNewSkillName('');
      await onRefresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDeleteSkill(id: string) {
    await api.deleteSkill(id);
    await onRefresh();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">My Learner Profile</h1>
            <p className="text-sm text-slate-600 mt-1">
              Update your background, preferences, or target career anytime. Changing your career goal triggers automatic roadmap re-calibration.
            </p>
          </div>
          <div className="text-xs text-slate-500 capitalize">
            Role: {user.role} · {user.email}
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-medium text-emerald-800">
          {statusMsg}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 space-y-5"
        >
          <h2 className="font-display text-lg font-bold text-slate-900">Background &amp; Career Preferences</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Career Goal</label>
              <input
                type="text"
                value={targetCareer}
                onChange={(e) => setTargetCareer(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Education</label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Experience</label>
              <input
                type="text"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Skill Level</label>
              <select
                value={currentSkillLevel}
                onChange={(e) => setCurrentSkillLevel(e.target.value as SkillLevel)}
                className="w-full px-3 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Learning Style</label>
              <select
                value={learningStyle}
                onChange={(e) => setLearningStyle(e.target.value as LearningStyle)}
                className="w-full px-3 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
              >
                <option value="Hands-on Projects">Hands-on Projects</option>
                <option value="Visual & Video">Visual &amp; Video</option>
                <option value="Reading & Docs">Reading &amp; Docs</option>
                <option value="Mixed Structured">Mixed Structured</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Weekly Hours</label>
              <input
                type="number"
                min={1}
                max={60}
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Certifications</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                placeholder="Add certification..."
                className="flex-1 px-3 py-1.5 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (certInput.trim()) {
                    setCertifications((c) => [...c, certInput.trim()]);
                    setCertInput('');
                  }
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Add
              </button>
            </div>
            <div className="space-y-1">
              {certifications.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl"
                >
                  <span className="text-slate-700">{c}</span>
                  <button
                    type="button"
                    onClick={() => setCertifications((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Learning Interests</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                placeholder="Add topic of interest..."
                className="flex-1 px-3 py-1.5 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (interestInput.trim()) {
                    setInterests((prev) => [...prev, interestInput.trim()]);
                    setInterestInput('');
                  }
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Add
              </button>
            </div>
            <div className="text-xs text-slate-500">{interests.join(' · ') || 'None added'}</div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#5B4FE9] hover:bg-[#4B3FD6] disabled:opacity-60 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving & Analyzing...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">Assessed Skills Inventory</h2>
            <p className="text-xs text-slate-500 mt-0.5">Add or calibrate individual skills</p>
          </div>

          <form onSubmit={handleAddSkill} className="space-y-2.5 bg-[#F8F9FC] p-3.5 rounded-2xl">
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="Skill name (e.g., PyTorch)"
              className="w-full px-3 py-2 text-sm bg-white text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
            />
            <div className="flex items-center gap-2">
              <select
                value={newSkillCat}
                onChange={(e) => setNewSkillCat(e.target.value as 'Technical' | 'Soft')}
                className="px-2.5 py-2 text-xs bg-white text-slate-900 border border-slate-200 rounded-xl"
              >
                <option value="Technical">Technical</option>
                <option value="Soft">Soft</option>
              </select>
              <input
                type="number"
                min={0}
                max={100}
                value={newSkillProf}
                onChange={(e) => setNewSkillProf(Number(e.target.value))}
                className="w-20 px-2.5 py-2 text-xs font-mono tabular-nums bg-white text-slate-900 border border-slate-200 rounded-xl"
              />
              <button
                type="submit"
                className="flex-1 py-2 px-3 bg-[#5B4FE9] hover:bg-[#4B3FD6] text-white text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> Add/Update
              </button>
            </div>
          </form>

          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {skills.map((s) => (
              <div key={s.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">{s.name}</div>
                  <div className="text-xs text-slate-500">
                    {s.category} · {s.level} · {s.source}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono tabular-nums text-sm font-bold text-[#5B4FE9]">{s.proficiency}%</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSkill(s.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    aria-label={`Delete ${s.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// NOTIFICATIONS VIEW
// ============================================================================

interface NotificationsViewProps {
  notifications: AppNotification[];
  onRefresh: () => Promise<void>;
  onNavigate: (tab: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ notifications, onRefresh, onNavigate }) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const items = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  async function markRead(id: string) {
    await api.markNotificationRead(id);
    await onRefresh();
  }

  async function markAll() {
    await api.markAllNotificationsRead();
    await onRefresh();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Notifications &amp; Smart Alerts
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time alerts from the Agent Orchestrator for milestones, weak assessment topics, and roadmap updates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filter === 'all' ? 'bg-white text-[#5B4FE9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filter === 'unread' ? 'bg-white text-[#5B4FE9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unread
            </button>
          </div>
          <button
            type="button"
            onClick={markAll}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <Check className="w-3.5 h-3.5 text-[#5B4FE9]" />
            Mark all read
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl divide-y divide-slate-100 overflow-hidden">
        {items.map((n) => (
          <div
            key={n.id}
            className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              !n.isRead ? 'bg-indigo-50/40' : ''
            }`}
          >
            <div className="space-y-1">
              <div className="text-xs text-slate-500">
                <span className="capitalize font-semibold text-[#5B4FE9]">{n.type}</span> ·{' '}
                <span className="font-mono tabular-nums">{new Date(n.createdAt).toLocaleString()}</span>
                {!n.isRead && ' · Unread'}
              </div>
              <div className="text-sm font-bold text-slate-900">{n.title}</div>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">{n.message}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {n.actionTab && (
                <button
                  type="button"
                  onClick={() => {
                    if (!n.isRead) markRead(n.id);
                    onNavigate(n.actionTab!);
                  }}
                  className="px-3.5 py-1.5 bg-[#5B4FE9] hover:bg-[#4B3FD6] text-white text-xs font-semibold rounded-xl whitespace-nowrap transition-colors"
                >
                  Open {n.actionTab}
                </button>
              )}
              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 rounded-xl whitespace-nowrap transition-colors"
                >
                  Mark read
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="p-10 text-center text-sm text-slate-500">
            <Bell className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            No notifications to show in this view.
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SETTINGS VIEW
// ============================================================================

interface SettingsViewProps {
  user: User;
  onUserUpdated: (user: User) => void;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onUserUpdated, onLogout }) => {
  const [name, setName] = useState(user.name);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const res = await api.updateAccountSettings({
        name,
        newPassword: newPassword.trim() || undefined,
      });
      onUserUpdated(res.user);
      setNewPassword('');
      setMsg('Account settings saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white border border-slate-200 rounded-3xl p-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-sm text-slate-600 mt-1">Manage your SkillPath AI credentials and session.</p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4"
      >
        {msg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
            {msg}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
          <input
            type="email"
            disabled
            value={user.email}
            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password (Optional)</label>
          <input
            type="password"
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            className="w-full px-3.5 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
          />
        </div>

        <div className="pt-3 flex items-center justify-between border-t border-slate-100">
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl transition-colors whitespace-nowrap"
          >
            Sign Out
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-[#5B4FE9] hover:bg-[#4B3FD6] text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
          >
            {saving ? 'Saving...' : 'Save Account Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
