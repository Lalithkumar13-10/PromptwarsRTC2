import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardCheck, Layers, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import type { AssessmentResult, Skill, SkillAssessment, SkillGapItem, SkillLevel } from '../types';

interface AssessmentsViewProps {
  skills: Skill[];
  gaps: SkillGapItem[];
  results: AssessmentResult[];
  preselectedSkill?: string;
  preselectedDifficulty?: SkillLevel;
  onAssessmentCompleted: () => Promise<void>;
  onNavigate: (tab: string) => void;
}

export const AssessmentsView: React.FC<AssessmentsViewProps> = ({
  skills,
  gaps,
  results,
  preselectedSkill,
  preselectedDifficulty,
  onAssessmentCompleted,
  onNavigate,
}) => {
  const availableSkills = Array.from(
    new Set([...gaps.map((g) => g.skillName), ...skills.map((s) => s.name)])
  );

  const [selectedSkill, setSelectedSkill] = useState(preselectedSkill || availableSkills[0] || 'Python');
  const [difficulty, setDifficulty] = useState<SkillLevel>(preselectedDifficulty || 'Intermediate');
  const [activeQuiz, setActiveQuiz] = useState<SkillAssessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [latestEvaluation, setLatestEvaluation] = useState<{
    result: AssessmentResult;
    adaptation: {
      performanceBand: 'poor' | 'steady' | 'strong';
      newProficiency: number;
      adaptationAction: string;
      adaptationSummary: string;
      beforeReadiness: number;
      afterReadiness: number;
    };
  } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (preselectedSkill) setSelectedSkill(preselectedSkill);
    if (preselectedDifficulty) setDifficulty(preselectedDifficulty);
  }, [preselectedSkill, preselectedDifficulty]);

  async function handleGenerate() {
    setError('');
    setLatestEvaluation(null);
    setGenerating(true);
    try {
      const res = await api.generateAssessment({ skillName: selectedSkill, difficulty });
      setActiveQuiz(res.assessment);
      setAnswers({});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmitQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!activeQuiz) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await api.submitAssessment(activeQuiz.id, answers);
      setLatestEvaluation(res);
      setActiveQuiz(null);
      await onAssessmentCompleted();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-[#5B4FE9]">Agent 1 &amp; Agent 4 · Dynamic Evaluation</div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              AI-Powered Skill Assessments
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Generate tailored multiple-choice and applied coding evaluations. Results automatically update your proficiency scores and trigger adaptive roadmap adjustments.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Skill</label>
              <select
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                disabled={generating || Boolean(activeQuiz)}
                className="px-3.5 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl min-w-[180px] focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
              >
                {availableSkills.map((sk) => (
                  <option key={sk} value={sk}>
                    {sk}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as SkillLevel)}
                disabled={generating || Boolean(activeQuiz)}
                className="px-3.5 py-2 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || submitting}
              className="px-4 py-2.5 bg-[#5B4FE9] hover:bg-[#4B3FD6] disabled:opacity-60 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 whitespace-nowrap transition-colors"
            >
              <ClipboardCheck className="w-4 h-4" />
              {generating ? 'Generating Questions...' : activeQuiz ? 'Regenerate Quiz' : 'Start AI Assessment'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>
        )}
      </div>

      {activeQuiz && (
        <form
          onSubmit={handleSubmitQuiz}
          className="bg-white border border-indigo-200 rounded-3xl p-6 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="text-xs text-[#5B4FE9] font-semibold">
                Active Assessment · {activeQuiz.skillName} · {activeQuiz.difficulty}
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 mt-0.5">
                Answer all {activeQuiz.questions.length} questions below
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveQuiz(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-6">
            {activeQuiz.questions.map((q, idx) => (
              <div key={q.id} className="pb-6 border-b border-slate-100 last:border-b-0 last:pb-0">
                <div className="text-xs text-slate-500 mb-1.5">
                  Question {idx + 1} of {activeQuiz.questions.length} · Topic: {q.topic} ·{' '}
                  {q.type === 'descriptive' ? 'Applied Short Answer' : 'Multiple Choice'}
                </div>
                <p className="text-sm font-semibold text-slate-900 leading-relaxed">{q.prompt}</p>

                {q.codeSnippet && (
                  <pre className="mt-3 p-3.5 bg-[#131720] border border-slate-800 text-slate-100 text-xs font-mono rounded-xl overflow-x-auto">
                    <code>{q.codeSnippet}</code>
                  </pre>
                )}

                {q.type === 'mcq' && q.options ? (
                  <div className="mt-3 space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const checked = answers[q.id] === optIdx;
                      return (
                        <label
                          key={optIdx}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors text-sm ${
                            checked
                              ? 'border-[#5B4FE9] bg-indigo-50/70 text-slate-900 font-medium'
                              : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={checked}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                            className="mt-0.5 accent-[#5B4FE9]"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    rows={4}
                    value={String(answers[q.id] ?? '')}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Write a clear technical explanation or code solution..."
                    className="mt-3 w-full px-3.5 py-2.5 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#5B4FE9] hover:bg-[#4B3FD6] disabled:opacity-60 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-2 transition-colors"
            >
              {submitting ? 'Agent 1 & 4 Evaluating...' : 'Submit for AI Evaluation'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {latestEvaluation && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="text-xs font-medium text-slate-500">
                Evaluation Complete · {latestEvaluation.result.skillName} ({latestEvaluation.result.difficulty})
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 mt-1">
                Score: <span className="font-mono tabular-nums text-[#5B4FE9]">{latestEvaluation.result.score}%</span> (
                {latestEvaluation.result.correctCount}/{latestEvaluation.result.totalCount} passed)
              </h2>
              <p className="text-sm text-slate-600 mt-1">{latestEvaluation.result.aiEvaluationSummary}</p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('roadmap')}
              className="px-4 py-2 bg-[#5B4FE9] hover:bg-[#4B3FD6] text-white text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 transition-colors"
            >
              Inspect Adapted Roadmap
            </button>
          </div>

          <div
            className={`p-4 rounded-2xl border text-sm ${
              latestEvaluation.adaptation.performanceBand === 'poor'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : latestEvaluation.adaptation.performanceBand === 'strong'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-indigo-50/70 border-indigo-200 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-xs mb-1">
              <Layers className="w-4 h-4" />
              Agent Orchestrator Adaptive Decision · {latestEvaluation.result.skillName} Proficiency →{' '}
              <span className="font-mono tabular-nums">{latestEvaluation.adaptation.newProficiency}%</span> · Readiness:{' '}
              <span className="font-mono tabular-nums">
                {latestEvaluation.adaptation.beforeReadiness}% → {latestEvaluation.adaptation.afterReadiness}%
              </span>
            </div>
            <p className="text-xs leading-relaxed">{latestEvaluation.adaptation.adaptationSummary}</p>
          </div>

          <div className="divide-y divide-slate-100">
            {latestEvaluation.result.feedback.map((f, idx) => (
              <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3">
                {f.isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-slate-900">
                    {f.topic} · <span className="font-mono tabular-nums">{f.score}%</span>
                  </div>
                  <p className="text-slate-600">{f.feedback}</p>
                  {!f.isCorrect && (
                    <p className="text-slate-500">
                      <span className="font-semibold text-slate-700">Reference:</span> {f.correctAnswerSummary}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-display text-lg font-bold text-slate-900">Assessment History</h2>
          <p className="text-xs text-slate-500">All evaluated diagnostics stored in your skill profile</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FC] border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-3 px-6">Skill</th>
                <th className="py-3 px-4">Difficulty</th>
                <th className="py-3 px-4 text-right">Score</th>
                <th className="py-3 px-4">Weak Topics</th>
                <th className="py-3 px-4">AI Summary</th>
                <th className="py-3 px-6 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {results.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-6 font-semibold text-slate-900">{r.skillName}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">{r.difficulty}</td>
                  <td
                    className={`py-3.5 px-4 text-right font-mono tabular-nums font-bold ${
                      r.score >= 80 ? 'text-emerald-600' : r.score >= 55 ? 'text-[#5B4FE9]' : 'text-amber-600'
                    }`}
                  >
                    {r.score}%
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    {r.weakTopics.length > 0 ? r.weakTopics.join(', ') : 'None flagged'}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500 max-w-md">{r.aiEvaluationSummary}</td>
                  <td className="py-3.5 px-6 text-right font-mono tabular-nums text-xs text-slate-500">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    No assessment history yet. Launch your first assessment above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
