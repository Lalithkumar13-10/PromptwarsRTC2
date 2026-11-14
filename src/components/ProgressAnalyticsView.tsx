import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardPayload } from '../lib/api';

interface ProgressAnalyticsViewProps {
  data: DashboardPayload;
}

export const ProgressAnalyticsView: React.FC<ProgressAnalyticsViewProps> = ({ data }) => {
  const { progressHistory, skills, learningPath, orchestrationLogs } = data;

  const totalHours = progressHistory.reduce((acc, p) => acc + p.hoursLogged, 0);
  const modulesDone = learningPath?.resources.filter((r) => r.status === 'completed').length || 0;
  const totalModules = learningPath?.resources.length || 0;

  const timelineData = progressHistory.map((p) => ({
    date: p.date.slice(5),
    readiness: p.readinessSnapshot,
    hours: p.hoursLogged,
  }));

  const skillBarData = skills.slice(0, 10).map((s) => ({
    name: s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name,
    proficiency: s.proficiency,
  }));

  return (
    <div className="space-y-6">
      <div className="bg-[#161B29] text-white rounded-3xl p-6 sm:p-7">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Progress Analytics</h1>
        <p className="text-sm text-slate-300 mt-1">
          Longitudinal view of your readiness progression, study hours, skill growth, and multi-agent adaptations.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/15">
          <div>
            <div className="text-xs font-medium text-slate-400">Total Learning Hours Logged</div>
            <div className="font-mono tabular-nums text-2xl font-bold text-white mt-1">
              {totalHours.toFixed(1)} hrs
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Modules Completed</div>
            <div className="font-mono tabular-nums text-2xl font-bold text-emerald-400 mt-1">
              {modulesDone} / {totalModules}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Agent Adaptations Executed</div>
            <div className="font-mono tabular-nums text-2xl font-bold text-[#9C94FF] mt-1">
              {orchestrationLogs.length}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold text-slate-900">Career Readiness Trajectory</h2>
          <p className="text-xs text-slate-500 mb-4">Readiness score snapshots over time (%)</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 8, right: 16, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="readinessGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5B4FE9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#5B4FE9" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
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
                <Area
                  type="monotone"
                  dataKey="readiness"
                  name="Readiness %"
                  stroke="#5B4FE9"
                  strokeWidth={2.5}
                  fill="url(#readinessGrad)"
                  dot={{ r: 4, fill: '#5B4FE9' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold text-slate-900">Skill Proficiency Distribution</h2>
          <p className="text-xs text-slate-500 mb-4">Current calibrated score across tracked skills</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillBarData} margin={{ top: 8, right: 16, left: -18, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  angle={-15}
                  textAnchor="end"
                  height={45}
                  axisLine={false}
                  tickLine={false}
                />
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
                <Bar dataKey="proficiency" name="Proficiency %" fill="#5B4FE9" radius={[6, 6, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Learning &amp; Orchestration Event Ledger
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {[...progressHistory].reverse().slice(0, 12).map((p) => (
            <div key={p.id} className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <div>
                <span className="font-medium text-slate-900">{p.eventDescription}</span>
                <span className="text-xs text-slate-500 ml-2">· {p.eventType}</span>
              </div>
              <div className="font-mono tabular-nums text-xs text-slate-500 shrink-0">
                {p.date} · {p.hoursLogged}h · Readiness {p.readinessSnapshot}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
