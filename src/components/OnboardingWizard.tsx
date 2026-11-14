import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Compass, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import type { CareerRole, LearningStyle, SkillLevel, User } from '../types';

interface OnboardingWizardProps {
  user: User;
  onCompleted: (updatedUser: User) => void;
}

const PRESET_SKILLS: { name: string; category: 'Technical' | 'Soft' }[] = [
  { name: 'Python', category: 'Technical' },
  { name: 'TypeScript', category: 'Technical' },
  { name: 'SQL', category: 'Technical' },
  { name: 'React', category: 'Technical' },
  { name: 'Machine Learning', category: 'Technical' },
  { name: 'Docker & Containers', category: 'Technical' },
  { name: 'Linux & Networking', category: 'Technical' },
  { name: 'Data Visualization', category: 'Technical' },
  { name: 'Technical Communication', category: 'Soft' },
  { name: 'System Design', category: 'Technical' },
];

const LEARNING_STYLES: { value: LearningStyle; desc: string }[] = [
  { value: 'Hands-on Projects', desc: 'Learn primarily by building real code, labs, and capstone exercises.' },
  { value: 'Visual & Video', desc: 'Prefer guided walkthroughs, architecture diagrams, and structured courses.' },
  { value: 'Reading & Docs', desc: 'Prefer official reference manuals, technical specifications, and deep reading.' },
  { value: 'Mixed Structured', desc: 'Balanced combination of documentation, guided tutorials, and applied drills.' },
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ user, onCompleted }) => {
  const [step, setStep] = useState(1);
  const [roles, setRoles] = useState<CareerRole[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [currentSkillLevel, setCurrentSkillLevel] = useState<SkillLevel>('Intermediate');
  const [education, setEducation] = useState('');
  const [experience, setExperience] = useState('');

  const [skills, setSkills] = useState<{ name: string; category: 'Technical' | 'Soft' }[]>([
    { name: 'Python', category: 'Technical' },
    { name: 'SQL', category: 'Technical' },
  ]);
  const [skillInput, setSkillInput] = useState('');
  const [skillCat, setSkillCat] = useState<'Technical' | 'Soft'>('Technical');

  const [certInput, setCertInput] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [projects, setProjects] = useState<{ title: string; description: string; technologies: string[] }[]>([]);
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projTech, setProjTech] = useState('');

  const [targetCareer, setTargetCareer] = useState('AI Engineer');
  const [customCareer, setCustomCareer] = useState('');
  const [interests, setInterests] = useState<string[]>(['Applied AI', 'Backend Systems']);
  const [interestInput, setInterestInput] = useState('');

  const [learningStyle, setLearningStyle] = useState<LearningStyle>('Hands-on Projects');
  const [weeklyHours, setWeeklyHours] = useState(10);

  useEffect(() => {
    api.getCareers().then((res) => setRoles(res.roles)).catch(() => {});
  }, []);

  function addSkill(name: string, category: 'Technical' | 'Soft') {
    const clean = name.trim();
    if (!clean) return;
    if (skills.some((s) => s.name.toLowerCase() === clean.toLowerCase())) return;
    setSkills((prev) => [...prev, { name: clean, category }]);
    setSkillInput('');
  }

  function addProject() {
    if (!projTitle.trim()) return;
    setProjects((prev) => [
      ...prev,
      {
        title: projTitle.trim(),
        description: projDesc.trim() || 'Applied software project',
        technologies: projTech
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      },
    ]);
    setProjTitle('');
    setProjDesc('');
    setProjTech('');
  }

  async function handleFinish() {
    setError('');
    setSubmitting(true);
    try {
      const chosenCareer = customCareer.trim() || targetCareer;
      const res = await api.completeOnboarding({
        education,
        experience,
        currentSkillLevel,
        skills,
        certifications,
        projects,
        interests,
        targetCareer: chosenCareer,
        learningStyle,
        weeklyHours,
      });
      onCompleted(res.user);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB] text-slate-900 flex flex-col">
      <header className="bg-[#131720] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#5B4FE9] flex items-center justify-center">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-white">SkillPath AI</span>
        </div>
        <div className="text-xs text-slate-300 font-medium tabular-nums">
          Onboarding {user.name} · Step {step} of 6
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-[#5B4FE9] transition-all duration-300"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  01. Current Skill Level &amp; Background
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Tell the Skill Assessment Agent where you are starting from so it can calibrate initial benchmarks.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Current Overall Skill Level</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['Beginner', 'Intermediate', 'Advanced'] as SkillLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setCurrentSkillLevel(lvl)}
                      className={`p-4 text-left rounded-2xl border transition-colors ${
                        currentSkillLevel === lvl
                          ? 'border-[#5B4FE9] bg-indigo-50/70'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-sm font-bold text-slate-900">{lvl}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {lvl === 'Beginner' && 'Exploring fundamentals & core syntax'}
                        {lvl === 'Intermediate' && 'Built projects, deepening architecture'}
                        {lvl === 'Advanced' && 'Production experience, seeking specialization'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Education</label>
                  <input
                    type="text"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder="e.g., B.S. Computer Science"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Experience Summary</label>
                  <input
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g., 1 year backend internship"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  02. Existing Technical &amp; Soft Skills
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Add skills you already have. Agent 1 will evaluate and score them alongside your projects.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill(skillInput, skillCat);
                    }
                  }}
                  placeholder="Enter a skill (e.g., PyTorch, Kubernetes, Leadership)"
                  className="flex-1 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
                />
                <select
                  value={skillCat}
                  onChange={(e) => setSkillCat(e.target.value as 'Technical' | 'Soft')}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                >
                  <option value="Technical">Technical</option>
                  <option value="Soft">Soft Skill</option>
                </select>
                <button
                  type="button"
                  onClick={() => addSkill(skillInput, skillCat)}
                  className="px-4 py-2 bg-[#5B4FE9] text-white text-sm font-semibold rounded-xl hover:bg-[#4B3FD6] flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Add Skill
                </button>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">Quick Select Common Skills</div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_SKILLS.map((ps) => {
                    const active = skills.some((s) => s.name.toLowerCase() === ps.name.toLowerCase());
                    return (
                      <button
                        key={ps.name}
                        type="button"
                        onClick={() =>
                          active
                            ? setSkills((prev) => prev.filter((s) => s.name.toLowerCase() !== ps.name.toLowerCase()))
                            : addSkill(ps.name, ps.category)
                        }
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                          active
                            ? 'bg-[#5B4FE9] text-white border-[#5B4FE9]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {ps.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="text-xs font-semibold text-slate-700 mb-2">Selected Skills ({skills.length})</div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl">
                  {skills.map((s) => (
                    <div key={s.name} className="px-3.5 py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-slate-900">{s.name}</span>
                        <span className="text-xs text-slate-500 ml-2">· {s.category}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSkills((prev) => prev.filter((item) => item.name !== s.name))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        aria-label={`Remove ${s.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {skills.length === 0 && (
                    <div className="px-3.5 py-4 text-xs text-slate-500">Add at least one skill above.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">03. Certifications &amp; Projects</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Provide evidence of applied work so the Skill Assessment Agent avoids assigning redundant beginner material.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Certifications</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={certInput}
                    onChange={(e) => setCertInput(e.target.value)}
                    placeholder="e.g., AWS Cloud Practitioner, DeepLearning.AI Specialization"
                    className="flex-1 px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (certInput.trim()) {
                        setCertifications((p) => [...p, certInput.trim()]);
                        setCertInput('');
                      }
                    }}
                    className="px-4 py-2 bg-[#5B4FE9] text-white text-xs font-semibold rounded-xl"
                  >
                    Add
                  </button>
                </div>
                {certifications.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {certifications.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                        <span className="text-slate-800 font-medium">{c}</span>
                        <button
                          type="button"
                          onClick={() => setCertifications((p) => p.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-5">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Completed Projects (Optional)
                </label>
                <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <input
                    type="text"
                    value={projTitle}
                    onChange={(e) => setProjTitle(e.target.value)}
                    placeholder="Project title (e.g., Sentiment Analysis API)"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl"
                  />
                  <input
                    type="text"
                    value={projDesc}
                    onChange={(e) => setProjDesc(e.target.value)}
                    placeholder="Short description of what you built"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={projTech}
                      onChange={(e) => setProjTech(e.target.value)}
                      placeholder="Technologies (comma-separated, e.g., Python, FastAPI)"
                      className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={addProject}
                      className="px-4 py-2 bg-[#5B4FE9] text-white text-xs font-semibold rounded-xl whitespace-nowrap"
                    >
                      Add Project
                    </button>
                  </div>
                </div>

                {projects.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {projects.map((p, idx) => (
                      <div key={idx} className="p-3 border border-slate-200 rounded-xl flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{p.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>
                          {p.technologies.length > 0 && (
                            <div className="text-xs text-slate-600 mt-1">{p.technologies.join(' · ')}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setProjects((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">04. Target Career Role</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Select a target role or enter a custom title. Agent 2 will construct the competency matrix and compute your skill gaps.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roles.map((r) => {
                  const selected = !customCareer.trim() && targetCareer === r.title;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setTargetCareer(r.title);
                        setCustomCareer('');
                      }}
                      className={`p-4 text-left rounded-2xl border transition-colors ${
                        selected ? 'border-[#5B4FE9] bg-indigo-50/70' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">{r.title}</span>
                        {selected && <Check className="w-4 h-4 text-[#5B4FE9]" />}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {r.domain} · {r.demandLevel} Demand
                      </div>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Or Specify Any Custom Career Goal
                </label>
                <input
                  type="text"
                  value={customCareer}
                  onChange={(e) => setCustomCareer(e.target.value)}
                  placeholder="e.g., Robotics Perception Engineer, Quantitative Developer"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Topics of Interest</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    placeholder="Add interest (e.g., Distributed Systems)"
                    className="flex-1 px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (interestInput.trim()) {
                        setInterests((p) => [...p, interestInput.trim()]);
                        setInterestInput('');
                      }
                    }}
                    className="px-4 py-2 bg-[#5B4FE9] text-white text-xs font-semibold rounded-xl"
                  >
                    Add
                  </button>
                </div>
                <div className="text-xs text-slate-600 mt-2">Current interests: {interests.join(' · ')}</div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">05. Preferred Learning Style</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Agent 3 adapts the resource mix (projects, official documentation, or guided courses) to match how you learn fastest.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LEARNING_STYLES.map((st) => (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => setLearningStyle(st.value)}
                    className={`p-4 text-left rounded-2xl border transition-colors ${
                      learningStyle === st.value
                        ? 'border-[#5B4FE9] bg-indigo-50/70'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-sm font-bold text-slate-900">{st.value}</div>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{st.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">06. Weekly Learning Capacity</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Set your realistic weekly commitment so the Agent Orchestrator estimates timelines accurately.
                </p>
              </div>

              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700">Available Hours Per Week</span>
                  <span className="font-mono tabular-nums text-2xl font-bold text-[#5B4FE9]">{weeklyHours} hrs/wk</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={40}
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  className="w-full accent-[#5B4FE9]"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono tabular-nums">
                  <span>2 hrs</span>
                  <span>15 hrs</span>
                  <span>30 hrs</span>
                  <span>40 hrs</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5 space-y-2 text-xs text-slate-600">
                <div className="font-bold text-slate-900 text-sm">Ready for Multi-Agent Analysis</div>
                <div>
                  Target Career:{' '}
                  <span className="font-semibold text-slate-900">{customCareer.trim() || targetCareer}</span>
                </div>
                <div>
                  Skills Submitted:{' '}
                  <span className="font-mono tabular-nums font-semibold text-slate-900">{skills.length}</span>
                </div>
                <div>
                  Learning Style: <span className="font-semibold text-slate-900">{learningStyle}</span>
                </div>
                <p className="text-slate-500 pt-1">
                  Clicking complete will invoke the Skill Assessment Agent, Career Intelligence Agent, and Learning Path Agent to generate your baseline readiness and personalized curriculum.
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              disabled={step === 1 || submitting}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>

            {step < 6 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(6, s + 1))}
                className="px-5 py-2.5 bg-[#5B4FE9] hover:bg-[#4B3FD6] text-white text-sm font-semibold rounded-xl flex items-center gap-1.5"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinish}
                className="px-6 py-2.5 bg-[#5B4FE9] hover:bg-[#4B3FD6] disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center gap-2"
              >
                {submitting ? 'Agents Analyzing Profile...' : 'Launch My Personalized Roadmap'}
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
