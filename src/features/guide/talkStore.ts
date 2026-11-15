import { create } from 'zustand';
import type { Locale } from '../../app/settingsStore';
import { config } from '../../config';
import { pickLocalized } from '../../i18n/useT';
import { runAction } from './actions';
import { useGuide } from './guideStore';
import { demoEntries } from './knowledge';
import { matchIntent } from './match';
import { listen, speechSupported, type Listening } from './speech';
import type { GuideContext } from './types';
import { WORD_MS } from './useTypewriter';

/**
 * The talk controls' state machine (docs: Talk Controls design):
 *   idle -> listening -> (thinking -> answering | unheard) -> idle
 * Chips, typed questions and the microphone all end in `submit`, so they share one path.
 */
export type TalkPhase = 'idle' | 'listening' | 'thinking' | 'answering' | 'unheard';
export type TalkError = 'denied' | 'unavailable' | null;

/** Demo mode (?demo=1): the mic "listens" this long to a scripted question, then answers it. */
const DEMO_LISTEN_MS = 2000;
/** The answer bubble stays this long after its last word; a "don't know" line, this long in all. */
const HOLD_AFTER_MS = 1400;
const HOLD_DONT_KNOW_MS = 3200;

const DEMO_KEY = 'zawaya-demo';

function readDemo(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      sessionStorage.setItem(DEMO_KEY, '1');
      return true;
    }
    return sessionStorage.getItem(DEMO_KEY) === '1';
  } catch {
    return false;
  }
}

interface TalkState {
  phase: TalkPhase;
  /** What the visitor is saying, live. */
  transcript: string;
  error: TalkError;
  demo: boolean;
  setDemo: (on: boolean) => void;
  toggleMic: (context: GuideContext, locale: Locale) => void;
  submit: (text: string, options: { entryId?: string; voice?: boolean }, context: GuideContext, locale: Locale) => Promise<void>;
  reset: () => void;
}

let listening: Listening | null = null;
let timers: number[] = [];
let demoIndex = 0;
/** Bumped by every new submit or reset, so a slow answer never overwrites a newer state. */
let turn = 0;

const clearTimers = () => {
  timers.forEach((id) => window.clearTimeout(id));
  timers = [];
};

export const useTalk = create<TalkState>()((set, get) => ({
  phase: 'idle',
  transcript: '',
  error: null,
  demo: typeof window === 'undefined' ? false : readDemo(),

  setDemo: (demo) => {
    try {
      if (demo) sessionStorage.setItem(DEMO_KEY, '1');
      else sessionStorage.removeItem(DEMO_KEY);
    } catch {
      /* the toggle still works for this page view */
    }
    set({ demo });
  },

  reset: () => {
    turn++;
    clearTimers();
    listening?.cancel();
    listening = null;
    set({ phase: 'idle', transcript: '', error: null });
  },

  toggleMic: (context, locale) => {
    const { phase, demo, submit } = get();
    if (phase === 'listening') {
      if (listening) listening.stop();
      else {
        clearTimers();
        set({ phase: 'idle', transcript: '' });
      }
      return;
    }
    if (phase === 'thinking' || phase === 'answering') return;

    if (demo) {
      // Jury demo: the listening animation with a scripted question, whatever the noise in the hall.
      const entry = demoEntries[demoIndex++ % demoEntries.length]!;
      const sample = entry.examples?.[locale]?.[0] ?? pickLocalized(entry.q, locale);
      // Chinese has no spaces: reveal it a few characters at a time instead of word by word.
      const words = locale === 'zh' ? (sample.match(/.{1,2}/gu) ?? [sample]) : sample.split(' ');
      set({ phase: 'listening', transcript: '', error: null });
      clearTimers();
      words.forEach((_, i) => {
        timers.push(window.setTimeout(() => get().phase === 'listening' && set({ transcript: words.slice(0, i + 1).join(locale === 'zh' ? '' : ' ') }), 250 + (i * (DEMO_LISTEN_MS - 700)) / words.length));
      });
      timers.push(window.setTimeout(() => void submit(sample, { voice: true }, context, locale), DEMO_LISTEN_MS));
      return;
    }

    if (!speechSupported()) {
      set({ phase: 'idle', error: 'unavailable' });
      return;
    }
    set({ phase: 'listening', transcript: '', error: null });
    listening = listen(locale, {
      onText: (transcript) => set({ transcript }),
      onEnd: (text, error) => {
        listening = null;
        if (error) set({ phase: 'idle', transcript: '', error });
        else if (!text) set({ phase: 'unheard', transcript: '' });
        else void submit(text, { voice: true }, context, locale);
      },
    });
  },

  submit: async (text, { entryId, voice = false }, context, locale) => {
    const mine = ++turn;
    clearTimers();
    listening = null;
    // A sentence spoken into the mic that matches nothing is "not heard", not an answer: the card
    // asks to pick a question instead. (With a server endpoint the server decides, so ask it.)
    if (voice && !entryId && !config.guideEndpoint && !matchIntent(text, context)) {
      set({ phase: 'unheard', transcript: '' });
      return;
    }
    set({ phase: 'thinking', transcript: '' });
    const answer = await useGuide.getState().ask({ text, entryId }, context, locale);
    if (mine !== turn) return;
    if (!answer) {
      set({ phase: 'idle' });
      return;
    }
    if (answer.kind === 'answer') runAction(answer.action);
    set({ phase: 'answering' });
    const hold = answer.kind === 'answer' ? answer.text.split(' ').length * WORD_MS + HOLD_AFTER_MS : HOLD_DONT_KNOW_MS;
    timers.push(window.setTimeout(() => get().phase === 'answering' && set({ phase: 'idle' }), hold));
  },
}));

if (import.meta.env.DEV) (window as unknown as { __talk: typeof useTalk }).__talk = useTalk;
