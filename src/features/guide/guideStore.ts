import { create } from 'zustand';
import type { Locale } from '../../app/settingsStore';
import { guideAdapter } from './adapters';
import type { GuideAnswer, GuideContext } from './types';
import { WORD_MS } from './useTypewriter';

export type GuideStatus = 'idle' | 'thinking' | 'speaking' | 'dont-know' | 'unavailable';

export type GuideMessage = { id: number; role: 'visitor'; text: string } | { id: number; role: 'guide'; answer: GuideAnswer };

interface GuideState {
  status: GuideStatus;
  messages: GuideMessage[];
  ask: (question: { text: string; entryId?: string }, context: GuideContext, locale: Locale) => Promise<GuideAnswer | null>;
}

/** The thinking state shows TV static; it never lasts more than 3 s (research: "under 3 s"). */
const MIN_THINKING_MS = 700;
const MAX_THINKING_MS = 2800;

let nextId = 1;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const useGuide = create<GuideState>()((set) => ({
  status: 'idle',
  messages: [],
  ask: async (question, context, locale) => {
    set((s) => ({ status: 'thinking', messages: [...s.messages, { id: nextId++, role: 'visitor', text: question.text }] }));
    try {
      const [answer] = await Promise.race([
        Promise.all([guideAdapter.ask({ ...question, context, locale }), wait(MIN_THINKING_MS)]),
        wait(MAX_THINKING_MS).then(() => {
          throw new Error('Guide timed out');
        }),
      ]);
      set((s) => ({
        status: answer.kind === 'answer' ? 'speaking' : 'dont-know',
        messages: [...s.messages, { id: nextId++, role: 'guide', answer }],
      }));
      if (answer.kind === 'answer') {
        // Back to idle once the words have been revealed.
        const ms = answer.text.split(' ').length * WORD_MS + 300;
        setTimeout(() => set((s) => (s.status === 'speaking' ? { status: 'idle' } : s)), ms);
      }
      return answer;
    } catch {
      set({ status: 'unavailable' });
      return null;
    }
  },
}));
