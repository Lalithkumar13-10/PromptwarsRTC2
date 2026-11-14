import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { api } from '../lib/api';
import type { LearnerProfile, MentorMessage, Skill } from '../types';

interface AIMentorViewProps {
  profile: LearnerProfile | null;
  skills: Skill[];
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

export const AIMentorView: React.FC<AIMentorViewProps> = ({
  profile,
  skills,
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .getMentorMessages()
      .then((res) => setMessages(res.messages))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
      onClearInitialPrompt?.();
    }
  }, [initialPrompt, onClearInitialPrompt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(textToSend: string) {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;
    setError('');
    setSending(true);
    setInput('');

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        userId: profile?.userId || '',
        role: 'user',
        content: trimmed,
        suggestedActions: [],
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await api.sendMentorMessage(trimmed);
      setMessages((prev) => [...prev.filter((m) => m.id !== tempId), res.userMessage, res.assistantMessage]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(trimmed);
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  const starterPrompts = [
    `What should I focus on this week to raise my ${profile?.targetCareer || 'career'} readiness?`,
    'Explain my weakest skill topic step by step with a practical exercise.',
    'Give me an alternative learning approach for my current roadmap module.',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-10rem)] min-h-[540px]">
      <div className="lg:col-span-4 bg-[#161B29] text-slate-200 rounded-3xl p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          <div className="text-xs font-semibold text-[#9C94FF]">Agent 5 · Grounded Context</div>
          <h2 className="font-display text-xl font-bold text-white mt-1">AI Career Mentor</h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Every response uses your live learner profile, assessed skill gaps, and roadmap state.
          </p>

          <div className="mt-5 pt-4 border-t border-white/10 space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Target Role</span>
              <span className="font-semibold text-white">{profile?.targetCareer || 'Unset'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Readiness</span>
              <span className="font-mono tabular-nums font-semibold text-[#9C94FF]">
                {profile?.careerReadinessScore ?? 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Learning Style</span>
              <span className="font-medium text-slate-200">{profile?.learningStyle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Weekly Pace</span>
              <span className="font-mono tabular-nums font-medium text-slate-200">{profile?.weeklyHours} hrs/wk</span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="text-xs font-semibold text-slate-300 mb-2">Tracked Skills ({skills.length})</div>
            <div className="space-y-1.5">
              {skills.slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 truncate">{s.name}</span>
                  <span className="font-mono tabular-nums text-slate-400">{s.proficiency}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="text-xs font-semibold text-slate-300 mb-2">Suggested Prompts</div>
          <div className="space-y-2">
            {starterPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(p)}
                disabled={sending}
                className="w-full text-left p-2.5 text-xs text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">Mentor Session</h3>
            <p className="text-xs text-slate-500">Personalized technical coaching &amp; roadmap guidance</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F8F9FC]">
          {loading ? (
            <div className="text-xs text-slate-500">Loading conversation history...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 max-w-md mx-auto">
              <h4 className="font-display text-lg font-bold text-slate-900">Start a Mentorship Conversation</h4>
              <p className="text-xs text-slate-500 mt-1.5">
                Ask about any concept in your {profile?.targetCareer || 'learning'} roadmap, request practice drills, or ask what to tackle next.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#5B4FE9] text-white font-medium'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  {m.content}
                </div>

                {m.role === 'assistant' && m.suggestedActions && m.suggestedActions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[85%]">
                    {m.suggestedActions.map((act, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={sending}
                        onClick={() => sendMessage(act)}
                        className="px-2.5 py-1 text-xs font-medium text-[#5B4FE9] bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          {sending && (
            <div className="text-xs text-slate-500">AI Mentor is reviewing your roadmap and composing guidance...</div>
          )}
          <div ref={endRef} />
        </div>

        {error && (
          <div className="mx-6 my-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="p-4 border-t border-slate-100 bg-white flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your mentor about concepts, career gaps, or study exercises..."
            className="flex-1 px-4 py-2.5 text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:bg-white"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-4 py-2.5 bg-[#5B4FE9] hover:bg-[#4B3FD6] disabled:opacity-50 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
