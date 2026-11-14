import React, { useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Lock,
  MessageSquare,
  Play,
  RefreshCw,
} from 'lucide-react';
import type { LearningPath, SkillLevel } from '../types';

interface LearningRoadmapViewProps {
  learningPath: LearningPath | null;
  onUpdateStatus: (moduleId: string, status: 'in_progress' | 'completed') => Promise<void>;
  onRegenerate: () => Promise<void>;
  onTakeAssessment: (skillName: string, difficulty: SkillLevel) => void;
  onAskMentor: (prompt: string) => void;
  busyModuleId: string | null;
  regenerating: boolean;
}

export const LearningRoadmapView: React.FC<LearningRoadmapViewProps> = ({
  learningPath,
  onUpdateStatus,
  onRegenerate,
  onTakeAssessment,
  onAskMentor,
  busyModuleId,
  regenerating,
}) => {
  const [phaseFilter, setPhaseFilter] = useState<'All' | SkillLevel>('All');

  if (!learningPath) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">
        <h2 className="font-display text-lg font-bold text-slate-900">No Active Roadmap Found</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          Generate a personalized roadmap aligned to your current skills and target career.
        </p>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="px-4 py-2 bg-[#5B4FE9] text-white text-xs font-semibold rounded-xl"
        >
          {regenerating ? 'Generating...' : 'Generate Learning Roadmap'}
        </button>
      </div>
    );
  }

  const modules = learningPath.resources;
  const completedCount = modules.filter((m) => m.status === 'completed').length;
  const totalHours = modules.reduce((sum, m) => sum + m.estimatedHours, 0);
  const filteredModules = phaseFilter === 'All' ? modules : modules.filter((m) => m.phase === phaseFilter);

  return (
    <div className="space-y-6">
      <div className="bg-[#161B29] text-white rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-indigo-200">
              Target Career: {learningPath.targetCareer} ·{' '}
              <span className="font-mono tabular-nums">
                {completedCount}/{modules.length} modules completed · {totalHours} total hrs
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-white mt-1">
              Personalized Learning Roadmap
            </h1>
            <p className="text-sm text-slate-300 mt-1.5 max-w-3xl">{learningPath.strategySummary}</p>
          </div>

          <button
            type="button"
            disabled={regenerating}
            onClick={onRegenerate}
            className="px-4 py-2.5 bg-white hover:bg-indigo-50 text-slate-900 text-xs font-semibold rounded-xl inline-flex items-center gap-2 shrink-0 whitespace-nowrap transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#5B4FE9] ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Re-calibrating...' : 'Re-calibrate with Agents'}
          </button>
        </div>

        {(learningPath.agentNotes.careerAgent || learningPath.agentNotes.orchestratorNote) && (
          <div className="mt-5 pt-5 border-t border-white/15 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <div className="font-semibold text-white">Career Intelligence Agent</div>
              <p className="text-slate-300 mt-1 leading-relaxed">{learningPath.agentNotes.careerAgent}</p>
            </div>
            <div>
              <div className="font-semibold text-white">Roadmap Recommendation Agent</div>
              <p className="text-slate-300 mt-1 leading-relaxed">{learningPath.agentNotes.roadmapAgent}</p>
            </div>
            <div>
              <div className="font-semibold text-white">Agent Orchestrator</div>
              <p className="text-slate-300 mt-1 leading-relaxed">{learningPath.agentNotes.orchestratorNote}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
          {(['All', 'Beginner', 'Intermediate', 'Advanced'] as const).map((phase) => (
            <button
              key={phase}
              type="button"
              onClick={() => setPhaseFilter(phase)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                phaseFilter === phase
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {phase}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-mono tabular-nums">
          Showing {filteredModules.length} of {modules.length} modules
        </div>
      </div>

      <div className="space-y-4">
        {filteredModules.map((mod) => {
          const isCompleted = mod.status === 'completed';
          const isInProgress = mod.status === 'in_progress';
          const isLocked = mod.status === 'locked';

          return (
            <div
              key={mod.id}
              className={`bg-white border rounded-3xl p-6 transition-colors ${
                isInProgress
                  ? 'border-[#5B4FE9]'
                  : isCompleted
                  ? 'border-emerald-200 bg-emerald-50/15'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono tabular-nums font-semibold text-slate-700">
                      Module {String(mod.orderIndex).padStart(2, '0')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{mod.phase} Phase</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-[#5B4FE9]">{mod.skillName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{mod.resourceType} ({mod.provider})</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{mod.estimatedHours} hrs</span>
                    {mod.isRemedial && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-amber-700">Adaptive Remedial Focus</span>
                      </>
                    )}
                  </div>

                  <div className="mt-1.5 flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-display text-lg font-bold text-slate-900">{mod.title}</h3>
                    <span
                      className={`text-xs font-semibold ${
                        isCompleted
                          ? 'text-emerald-600'
                          : isInProgress
                          ? 'text-[#5B4FE9]'
                          : isLocked
                          ? 'text-slate-400'
                          : 'text-slate-600'
                      }`}
                    >
                      {isCompleted && '· Completed'}
                      {isInProgress && '· In Progress'}
                      {mod.status === 'not_started' && '· Ready to Start'}
                      {isLocked && '· Unlocks Next'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs border-t border-slate-100 pt-4">
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">Learning Objectives</div>
                      <ul className="space-y-1 text-slate-600 list-disc list-inside">
                        {mod.learningObjectives.map((obj, idx) => (
                          <li key={idx}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">Practical Exercise</div>
                      <p className="text-slate-600 leading-relaxed">{mod.practicalExercise}</p>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">Expected Outcome</div>
                      <p className="text-slate-600 leading-relaxed">{mod.expectedOutcome}</p>
                      <a
                        href={mod.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#5B4FE9] hover:text-[#4B3FD6] font-semibold mt-2"
                      >
                        Open {mod.provider} Resource <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row lg:flex-col flex-wrap gap-2 shrink-0 lg:w-44">
                  {!isCompleted && !isLocked && mod.status === 'not_started' && (
                    <button
                      type="button"
                      disabled={busyModuleId === mod.id}
                      onClick={() => onUpdateStatus(mod.id, 'in_progress')}
                      className="px-3.5 py-2 bg-[#131720] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Start Learning
                    </button>
                  )}

                  {!isCompleted && (
                    <button
                      type="button"
                      disabled={busyModuleId === mod.id || isLocked}
                      onClick={() => onUpdateStatus(mod.id, 'completed')}
                      className="px-3.5 py-2 bg-[#5B4FE9] hover:bg-[#4B3FD6] disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      {isLocked ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      {busyModuleId === mod.id ? 'Updating...' : isLocked ? 'Locked' : 'Mark as Completed'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onTakeAssessment(mod.skillName, mod.difficulty)}
                    className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-[#5B4FE9]" />
                    Take Assessment
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onAskMentor(
                        `Explain the key concepts and practical approach for my roadmap module "${mod.title}" (${mod.skillName}) and give me a quick study plan.`
                      )
                    }
                    className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                    Ask AI Mentor
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
