import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardPayload } from '../lib/api';
import type { SkillLevel } from '../types';

interface SkillAnalysisViewProps {
  data: DashboardPayload;
  onStartAssessment: (skillName: string, difficulty?: SkillLevel) => void;
}

export const SkillAnalysisView: React.FC<SkillAnalysisViewProps> = ({ data, onStartAssessment }) => {
  const { gapReport, skills, profile } = data;

  if (!gapReport) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center">
        <h2 className="font-display text-lg font-bold text-slate-900">No Career Target Selected</h2>
        <p className="text-sm text-slate-500 mt-1">
          Select a target career in Career Explorer or My Profile to run Agent 2 gap analysis.
        </p>
      </div>
    );
  }

  const chartData = gapReport.gaps.map((g) => ({
    name: g.skillName.length > 16 ? g.skillName.slice(0, 15) + '…' : g.skillName,
    fullName: g.skillName,
    current: g.currentLevel,
    required: g.requiredLevel,
    gap: g.gap,
  }));

  return (
    <div className="space-y-6">
      <div className="bg-[#161B29] text-white rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-indigo-200">
            Agent 1 &amp; Agent 2 Report · Target Role: {gapReport.targetCareer}
          </div>
          <h1 className="font-display text-2xl font-bold text-white mt-1">
            Skill Gap &amp; Career Readiness Analysis
          </h1>
          <p className="text-sm text-slate-300 mt-1.5 max-w-3xl">{gapReport.executiveSummary}</p>
        </div>

        <div className="flex items-center gap-6 shrink-0 border-t md:border-t-0 md:border-l border-white/15 pt-4 md:pt-0 md:pl-6">
          <div>
            <div className="text-xs text-slate-400">Readiness Score</div>
            <div className="font-mono tabular-nums text-3xl font-bold text-[#9C94FF]">
              {gapReport.readinessScore}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Skills Mastered</div>
            <div className="font-mono tabular-nums text-3xl font-bold text-white">
              {gapReport.skillsMastered}/{gapReport.gaps.length}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-3xl p-6">
          <h2 className="font-display text-base font-bold text-slate-900">
            Current Skill Level vs. Required Level
          </h2>
          <p className="text-xs text-slate-500 mb-4">Benchmark comparison for {profile?.targetCareer}</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 16, left: -16, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={48}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="current" name="Current Level" fill="#5B4FE9" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="required" name="Required Level" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-3xl p-6">
          <h2 className="font-display text-base font-bold text-slate-900">Competency Coverage Radar</h2>
          <p className="text-xs text-slate-500 mb-4">Multi-axis alignment with role benchmarks</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Radar name="Required" dataKey="required" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.25} />
                <Radar name="Current" dataKey="current" stroke="#5B4FE9" fill="#5B4FE9" fillOpacity={0.35} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6">
          <h3 className="font-display text-base font-bold text-slate-900">Verified Strengths</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">Skills meeting or within 10 points of target requirement</p>
          {gapReport.strengths.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {gapReport.strengths.map((s) => {
                const match = skills.find((sk) => sk.name.toLowerCase().includes(s.toLowerCase()));
                return (
                  <li key={s} className="py-2.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">{s}</span>
                    <span className="font-mono tabular-nums text-xs font-semibold text-emerald-600">
                      {match ? `${match.proficiency}% · ${match.level}` : 'Target Met'}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Complete modules or assessments to establish verified strengths.</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6">
          <h3 className="font-display text-base font-bold text-slate-900">High-Priority Weaknesses</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">Skills with gaps of 25+ points requiring structured focus</p>
          {gapReport.weaknesses.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {gapReport.weaknesses.map((w) => {
                const gapItem = gapReport.gaps.find((g) => g.skillName === w);
                return (
                  <li key={w} className="py-2.5 flex items-center justify-between text-sm gap-3">
                    <div>
                      <span className="font-medium text-slate-900">{w}</span>
                      {gapItem && (
                        <span className="text-xs text-slate-500 ml-2 font-mono tabular-nums">
                          {gapItem.currentLevel}% / {gapItem.requiredLevel}%
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartAssessment(w, 'Beginner')}
                      className="text-xs font-semibold text-[#5B4FE9] hover:text-[#4B3FD6] shrink-0 whitespace-nowrap"
                    >
                      Assess now
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No severe skill weaknesses detected for this target career.</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">Skill Gap Comparison Matrix</h2>
            <p className="text-xs text-slate-500">Target Role: {gapReport.targetCareer}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FC] border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">Skill</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Current Level</th>
                <th className="py-3 px-4 text-right">Required Level</th>
                <th className="py-3 px-4 text-right">Gap</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {gapReport.gaps.map((g) => (
                <tr key={g.skillName} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-6">
                    <div className="font-semibold text-slate-900">{g.skillName}</div>
                    <div className="text-xs text-slate-500 max-w-md">{g.description}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">{g.category}</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                    {g.currentLevel}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600">
                    {g.requiredLevel}
                  </td>
                  <td
                    className={`py-3.5 px-4 text-right font-mono tabular-nums font-semibold ${
                      g.gap === 0 ? 'text-emerald-600' : g.gap >= 30 ? 'text-rose-600' : 'text-amber-600'
                    }`}
                  >
                    {g.gap}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-700">{g.priority}</td>
                  <td className="py-3.5 px-4 text-xs font-semibold">
                    <span
                      className={
                        g.status === 'Mastered'
                          ? 'text-emerald-600'
                          : g.status === 'Critical Gap'
                          ? 'text-rose-600'
                          : g.status === 'Needs Focus'
                          ? 'text-amber-600'
                          : 'text-[#5B4FE9]'
                      }
                    >
                      {g.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        onStartAssessment(
                          g.skillName,
                          g.currentLevel >= 70 ? 'Advanced' : g.currentLevel >= 40 ? 'Intermediate' : 'Beginner'
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#5B4FE9] hover:text-[#4B3FD6] whitespace-nowrap"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      Test Skill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
