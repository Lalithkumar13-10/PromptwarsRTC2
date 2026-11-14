import React, { useEffect, useState } from 'react';
import { Building2, Plus, Search, Users, X } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import type { OrganizationAnalytics, OrganizationMemberSummary } from '../types';

export const OrganizationDashboardView: React.FC = () => {
  const [analytics, setAnalytics] = useState<OrganizationAnalytics | null>(null);
  const [programs, setPrograms] = useState<OrganizationAnalytics['groupRecommendations']>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPrograms, setGeneratingPrograms] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [selectedMember, setSelectedMember] = useState<OrganizationMemberSummary | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    department: 'AI & Data Fellowship',
    jobTitle: '',
    targetCareer: 'AI Engineer',
    initialSkills: 'Python, SQL',
  });
  const [addingMember, setAddingMember] = useState(false);
  const [error, setError] = useState('');

  async function loadOrgAnalytics() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getOrganizationAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrgAnalytics();
  }, []);

  async function handleGeneratePrograms() {
    if (!analytics) return;
    setGeneratingPrograms(true);
    try {
      const res = await api.generateOrganizationPrograms({
        organizationName: analytics.organization.name,
        commonGaps: analytics.commonSkillGaps,
        departmentMetrics: analytics.departmentMetrics,
      });
      setPrograms(res.programs);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGeneratingPrograms(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddingMember(true);
    setError('');
    try {
      await api.addOrganizationMember({
        name: newMember.name,
        email: newMember.email,
        department: newMember.department,
        jobTitle: newMember.jobTitle,
        targetCareer: newMember.targetCareer,
        initialSkills: newMember.initialSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setShowAddModal(false);
      setNewMember({
        name: '',
        email: '',
        department: 'AI & Data Fellowship',
        jobTitle: '',
        targetCareer: 'AI Engineer',
        initialSkills: 'Python, SQL',
      });
      await loadOrgAnalytics();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAddingMember(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-sm text-slate-500">
        Aggregating workforce &amp; student skill analytics...
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white border border-rose-200 rounded-3xl p-8 text-sm text-rose-700">
        {error || 'Unable to load organization dashboard.'}
      </div>
    );
  }

  const departments = ['All', ...Array.from(new Set(analytics.members.map((m) => m.department)))];
  const filteredMembers = analytics.members.filter((m) => {
    const matchesDept = deptFilter === 'All' || m.department === deptFilter;
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.targetCareer.toLowerCase().includes(search.toLowerCase()) ||
      m.department.toLowerCase().includes(search.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="bg-[#161B29] text-white rounded-3xl p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-indigo-200 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#9C94FF]" />
            {analytics.organization.type} · {analytics.organization.industry}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
            {analytics.organization.name} — Cohort Intelligence
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Track department-wide readiness, identify shared skill bottlenecks, and generate targeted cohort training programs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleGeneratePrograms}
            disabled={generatingPrograms}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl whitespace-nowrap transition-colors"
          >
            {generatingPrograms ? 'Designing Programs...' : 'Recommend Group Training'}
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#5B4FE9] hover:bg-[#4B3FD6] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Learner / Employee
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-medium text-slate-500">Tracked Cohort Members</div>
          <div className="font-mono tabular-nums text-3xl font-bold text-slate-900 mt-2">
            {analytics.members.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Across {analytics.departmentMetrics.length} departments</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-medium text-slate-500">Workforce Career Readiness</div>
          <div className="font-mono tabular-nums text-3xl font-bold text-[#5B4FE9] mt-2">
            {analytics.overallReadiness}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Role-weighted average</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-medium text-slate-500">Learning Completion Rate</div>
          <div className="font-mono tabular-nums text-3xl font-bold text-emerald-600 mt-2">
            {analytics.overallCompletionRate}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Roadmap modules finished</div>
        </div>
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5">
          <div className="text-xs font-medium text-amber-800">Top Common Skill Gap</div>
          <div className="text-lg font-bold text-slate-900 mt-2 truncate">
            {analytics.commonSkillGaps[0]?.skillName || 'None'}
          </div>
          <div className="text-xs text-amber-700 font-mono tabular-nums mt-1">
            {analytics.commonSkillGaps[0]
              ? `Avg gap ${analytics.commonSkillGaps[0].avgGap} pts · ${analytics.commonSkillGaps[0].affectedCount} members`
              : 'Cohort aligned'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold text-slate-900">Most Common Skill Gaps</h2>
          <p className="text-xs text-slate-500 mb-4">Average point gap across affected learners</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.commonSkillGaps} margin={{ top: 8, right: 16, left: -16, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="skillName"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  angle={-15}
                  textAnchor="end"
                  height={48}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#0f172a',
                  }}
                />
                <Bar dataKey="avgGap" name="Avg Gap (pts)" fill="#d97706" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold text-slate-900">Department Readiness &amp; Completion</h2>
          <p className="text-xs text-slate-500 mb-4">Comparison by department or cohort group</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.departmentMetrics} margin={{ top: 8, right: 16, left: -16, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#0f172a',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#475569' }} />
                <Bar dataKey="avgReadiness" name="Avg Readiness %" fill="#5B4FE9" radius={[6, 6, 0, 0]} barSize={22} />
                <Bar dataKey="completionRate" name="Completion %" fill="#10b981" radius={[6, 6, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {programs.length > 0 && (
        <div className="bg-white border border-indigo-200 rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-3">
            AI-Recommended Group Training Programs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {programs.map((p, idx) => (
              <div key={idx} className="p-4 bg-[#F8F9FC] rounded-2xl">
                <div className="text-xs text-[#5B4FE9] font-semibold">
                  {p.targetDepartment} · <span className="font-mono tabular-nums">{p.estimatedWeeks} weeks</span>
                </div>
                <h3 className="font-display text-base font-bold text-slate-900 mt-1">{p.title}</h3>
                <div className="text-xs text-slate-500 mt-1">Focus: {p.targetSkills.join(', ')}</div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{p.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#5B4FE9]" />
            <h2 className="font-display text-lg font-bold text-slate-900">Member Skill Gap Directory</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search member or role..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FC] border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-3 px-6">Member</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Target Career</th>
                <th className="py-3 px-4 text-right">Readiness</th>
                <th className="py-3 px-4 text-right">Roadmap</th>
                <th className="py-3 px-4">Top Gaps</th>
                <th className="py-3 px-6 text-right">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredMembers.map((m) => (
                <tr key={m.memberId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-6">
                    <div className="font-semibold text-slate-900">{m.name}</div>
                    <div className="text-xs text-slate-500">
                      {m.jobTitle} · {m.email}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">{m.department}</td>
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-900">{m.targetCareer}</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-[#5B4FE9]">
                    {m.readinessScore}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {m.roadmapCompletionPct}%
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    {m.topGaps.map((g) => `${g.skillName} (-${g.gap})`).join(', ') || 'Aligned'}
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedMember(m)}
                      className="text-xs font-semibold text-[#5B4FE9] hover:text-[#4B3FD6] hover:underline whitespace-nowrap"
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-slate-500">
                  {selectedMember.department} · {selectedMember.jobTitle}
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900">{selectedMember.name}</h3>
                <div className="text-xs text-[#5B4FE9] font-semibold mt-0.5">
                  Target: {selectedMember.targetCareer} ({selectedMember.readinessScore}% readiness)
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="text-xs font-semibold text-slate-700 mb-2">Assessed Skills</div>
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {selectedMember.skills.map((sk) => (
                  <div key={sk.id} className="py-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-900">{sk.name}</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-600">
                      {sk.proficiency}% · {sk.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="text-xs font-semibold text-slate-700 mb-2">Priority Skill Gaps</div>
              {selectedMember.topGaps.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedMember.topGaps.map((g) => (
                    <div key={g.skillName} className="flex items-center justify-between text-xs">
                      <span className="text-slate-700">
                        {g.skillName} ({g.priority})
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-amber-600">-{g.gap} pts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No priority gaps detected.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddMember}
            className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-slate-900">Add Learner to Organization</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newMember.name}
                  onChange={(e) => setNewMember((m) => ({ ...m, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newMember.email}
                  onChange={(e) => setNewMember((m) => ({ ...m, email: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Group</label>
                  <input
                    type="text"
                    required
                    value={newMember.department}
                    onChange={(e) => setNewMember((m) => ({ ...m, department: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={newMember.jobTitle}
                    onChange={(e) => setNewMember((m) => ({ ...m, jobTitle: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Career Role</label>
                <input
                  type="text"
                  required
                  value={newMember.targetCareer}
                  onChange={(e) => setNewMember((m) => ({ ...m, targetCareer: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Existing Skills (comma-separated)</label>
                <input
                  type="text"
                  value={newMember.initialSkills}
                  onChange={(e) => setNewMember((m) => ({ ...m, initialSkills: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingMember}
                className="px-4 py-2 bg-[#5B4FE9] hover:bg-[#4B3FD6] disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
              >
                {addingMember ? 'Onboarding with AI...' : 'Add & Analyze Member'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
