import type { Locale } from '../../app/settingsStore';

/**
 * The browser's own speech recognition: no server of ours, no key. Chrome and Safari send the audio
 * to their vendor's service while listening; nothing is stored by this app.
 */
interface RecognitionResult {
  readonly length: number;
  [index: number]: { transcript: string };
}
interface RecognitionEvent {
  results: { readonly length: number; [index: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => Recognition;

const ctor = (): RecognitionCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export const speechSupported = () => ctor() !== undefined;

/** Language tags to try in order: Tunisian Arabic first, then Saudi Arabic, which every engine has. */
export const SPEECH_LANGS: Record<Locale, string[]> = { ar: ['ar-TN', 'ar-SA'], fr: ['fr-FR'], en: ['en-US'], zh: ['zh-CN'] };

/** Stop after this long without new words, and never listen longer than the maximum. */
export const SILENCE_MS = 1500;
export const MAX_LISTEN_MS = 8000;

export type SpeechError = 'denied' | 'unavailable';

export interface Listening {
  /** Ends the capture; the words heard so far are still delivered to onEnd. */
  stop: () => void;
  /** Drops everything without delivering anything. */
  cancel: () => void;
}

export function listen(locale: Locale, handlers: { onText: (text: string) => void; onEnd: (text: string, error?: SpeechError) => void }): Listening {
  const Ctor = ctor();
  let text = '';
  let finished = false;
  let rec: Recognition | null = null;
  let silence = 0;
  let max = 0;
  const langs = [...SPEECH_LANGS[locale]];

  const finish = (error?: SpeechError) => {
    if (finished) return;
    finished = true;
    window.clearTimeout(silence);
    window.clearTimeout(max);
    handlers.onEnd(text.trim(), error);
  };

  const begin = () => {
    if (!Ctor) return finish('unavailable');
    const r = new Ctor();
    rec = r;
    r.lang = langs.shift()!;
    r.interimResults = true;
    r.continuous = true;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let heard = '';
      for (let i = 0; i < e.results.length; i++) heard += `${e.results[i]![0]!.transcript} `;
      text = heard.trim();
      handlers.onText(text);
      window.clearTimeout(silence);
      silence = window.setTimeout(() => r.stop(), SILENCE_MS);
    };
    r.onerror = (e) => {
      if (e.error === 'language-not-supported' && langs.length) {
        r.onend = null;
        return begin();
      }
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') return finish('denied');
      if (e.error === 'audio-capture' || e.error === 'network') return finish('unavailable');
      // 'no-speech' and 'aborted' just end with whatever was heard (nothing).
    };
    r.onend = () => finish();
    try {
      r.start();
    } catch {
      finish('unavailable');
    }
  };

  max = window.setTimeout(() => rec?.stop(), MAX_LISTEN_MS);
  begin();

  return {
    stop: () => rec?.stop(),
    cancel: () => {
      finished = true;
      window.clearTimeout(silence);
      window.clearTimeout(max);
      if (rec) {
        rec.onend = rec.onerror = rec.onresult = null;
        rec.abort();
      }
    },
  };
}
