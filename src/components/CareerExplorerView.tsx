import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Compass, Search } from 'lucide-react';
import { api } from '../lib/api';
import type { CareerRole, Skill } from '../types';

interface CareerExplorerViewProps {
  currentTargetCareer: string;
  userSkills: Skill[];
  onSwitchCareer: (newCareerTitle: string) => Promise<void>;
  switching: boolean;
}

export const CareerExplorerView: React.FC<CareerExplorerViewProps> = ({
  currentTargetCareer,
  userSkills,
  onSwitchCareer,
  switching,
}) => {
  const [roles, setRoles] = useState<CareerRole[]>([]);
  const [search, setSearch] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [selectedRole, setSelectedRole] = useState<CareerRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCareers()
      .then((res) => {
        setRoles(res.roles);
        const current = res.roles.find((r) => r.title.toLowerCase() === currentTargetCareer.toLowerCase());
        setSelectedRole(current || res.roles[0] || null);
      })
      .finally(() => setLoading(false));
  }, [currentTargetCareer]);

  const filteredRoles = roles.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.domain.toLowerCase().includes(search.toLowerCase())
  );

  function computePreviewReadiness(role: CareerRole): number {
    if (!role.requiredSkills.length) return 0;
    let sum = 0;
    for (const req of role.requiredSkills) {
      const match = userSkills.find(
        (s) =>
          s.name.toLowerCase() === req.name.toLowerCase() ||
          s.name.toLowerCase().includes(req.name.toLowerCase())
      );
      const cur = match ? match.proficiency : 0;
      sum += Math.min(1, cur / Math.max(1, req.requiredLevel));
    }
    return Math.round((sum / role.requiredSkills.length) * 100);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Career Explorer</h1>
          <p className="text-sm text-slate-600 mt-1">
            Inspect required competency matrices across roles. Switching your target triggers Agent 2 &amp; Agent 3 to adapt your roadmap while preserving overlapping completed modules.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customRole.trim()) {
              onSwitchCareer(customRole.trim());
            }
          }}
          className="flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
            placeholder="Custom role (e.g., AI Security Lead)"
            className="px-3.5 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl w-60 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
          />
          <button
            type="submit"
            disabled={switching || !customRole.trim()}
            className="px-4 py-2 bg-[#5B4FE9] hover:bg-[#4B3FD6] disabled:opacity-50 text-white text-xs font-semibold rounded-xl whitespace-nowrap"
          >
            {switching ? 'Adapting...' : 'Target Custom Role'}
          </button>
        </form>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter roles by title or domain..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
        />
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-sm text-slate-500">
          Loading career intelligence catalog...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            {filteredRoles.map((r) => {
              const isCurrent = r.title.toLowerCase() === currentTargetCareer.toLowerCase();
              const isSelected = selectedRole?.id === r.id;
              const estReadiness = computePreviewReadiness(r);

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/70 border-[#5B4FE9]'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-slate-900">{r.title}</span>
                    {isCurrent && (
                      <span className="text-xs font-semibold text-[#5B4FE9] inline-flex items-center gap-1 whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active Target
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {r.domain} · {r.avgSalaryRange}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <span className="text-slate-600">{r.requiredSkills.length} core competencies</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      Est. Match: {estReadiness}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7">
            {selectedRole ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sticky top-20">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
                  <div>
                    <div className="text-xs text-slate-500">
                      {selectedRole.domain} · {selectedRole.demandLevel} Demand · {selectedRole.avgSalaryRange}
                    </div>
                    <h2 className="font-display text-2xl font-bold text-slate-900 mt-1">
                      {selectedRole.title}
                    </h2>
                    <p className="text-sm text-slate-600 mt-2">{selectedRole.description}</p>
                  </div>

                  {selectedRole.title.toLowerCase() !== currentTargetCareer.toLowerCase() ? (
                    <button
                      type="button"
                      disabled={switching}
                      onClick={() => onSwitchCareer(selectedRole.title)}
                      className="px-4 py-2.5 bg-[#5B4FE9] hover:bg-[#4B3FD6] disabled:opacity-60 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                    >
                      {switching ? 'Adapting Roadmap...' : 'Switch Target Career'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="px-3.5 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0">
                      Current Goal
                    </span>
                  )}
                </div>

                <div className="mt-5">
                  <h3 className="text-xs font-semibold text-slate-700 mb-3">
                    Required Competency Matrix vs. Your Current Profile
                  </h3>
                  <div className="divide-y divide-slate-100">
                    {selectedRole.requiredSkills.map((req) => {
                      const match = userSkills.find(
                        (s) =>
                          s.name.toLowerCase() === req.name.toLowerCase() ||
                          s.name.toLowerCase().includes(req.name.toLowerCase())
                      );
                      const current = match ? match.proficiency : 0;
                      const gap = Math.max(0, req.requiredLevel - current);

                      return (
                        <div key={req.name} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex items-center justify-between text-sm">
                            <div>
                              <span className="font-semibold text-slate-900">{req.name}</span>
                              <span className="text-xs text-slate-500 ml-2">
                                · {req.category} · {req.priority}
                              </span>
                            </div>
                            <div className="font-mono tabular-nums text-xs">
                              <span className="font-semibold text-slate-900">{current}%</span>
                              <span className="text-slate-400"> / {req.requiredLevel}%</span>
                              {gap > 0 && <span className="text-amber-600 ml-2">(-{gap})</span>}
                            </div>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden relative">
                            <div
                              className="h-full bg-[#5B4FE9] rounded-full"
                              style={{ width: `${Math.min(100, (current / req.requiredLevel) * 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5">{req.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-sm text-slate-500">
                <Compass className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                Select a role to view its required skills.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
