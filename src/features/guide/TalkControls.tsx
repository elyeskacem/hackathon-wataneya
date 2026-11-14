import { useEffect, useRef, useState, type FormEvent, type WheelEvent } from 'react';
import { useSettings, isRtl } from '../../app/settingsStore';
import { useT } from '../../i18n/useT';
import { TvStatic } from '../../ui/TvStatic';
import { useGuideContext } from './actions';
import { useGuide } from './guideStore';
import { chipsFor, entryById } from './knowledge';
import { speechSupported } from './speech';
import type { GuideAnswer } from './types';
import { useTalk } from './talkStore';
import { useTypewriter } from './useTypewriter';
import styles from './TalkControls.module.css';

/**
 * The guide's talk controls, bottom of the panel (Talk Controls design): suggestion chips, the
 * microphone, and one card above them that changes with the state: listening, not heard, answering.
 * Chips, typed questions and speech all go through the same store, so an answer is always one tap away.
 */
export function TalkControls({ inputRef }: { inputRef: React.RefObject<HTMLInputElement> }) {
  const { t, pick, locale } = useT();
  const context = useGuideContext();
  const rtl = isRtl(locale);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const { phase: talkPhase, transcript, error, demo, toggleMic, submit } = useTalk();
  const status = useGuide((s) => s.status);
  const messages = useGuide((s) => s.messages);
  const [text, setText] = useState('');

  // Something asked the guide without the talk store (a hotspot, a story stop): still show it as thinking.
  const phase = talkPhase === 'idle' && status === 'thinking' ? 'thinking' : talkPhase;
  const listening = phase === 'listening';
  const busy = phase === 'thinking' || phase === 'answering';
  const supported = demo || speechSupported();
  const note = !supported ? t('talk.unsupported') : error ? t(error === 'denied' ? 'talk.denied' : 'talk.unavailable') : null;

  const last = messages[messages.length - 1];
  const answer = last?.role === 'guide' ? last.answer : null;
  const chipIds = answer ? (answer.kind === 'answer' ? answer.followUps : answer.suggestions).slice(0, 2) : chipsFor(context).map((e) => e.id);
  const chips = chipIds.map(entryById).filter((e) => e !== undefined);

  const ask = (q: string, entryId?: string) => void submit(q, { entryId, voice: false }, context, locale);
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy || listening) return;
    setText('');
    ask(q);
  };

  // The jury demo can be switched on without a URL: Alt + Shift + D while the guide is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyD') useTalk.getState().setDemo(!useTalk.getState().demo);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Closing the panel ends any listening and drops a half-shown answer.
  useEffect(() => () => useTalk.getState().reset(), []);

  // A mouse wheel scrolls the chip row sideways, so every chip is reachable on a desktop too.
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    el.scrollLeft += e.deltaY * (rtl ? -1 : 1);
  };

  const live = useLiveMessage(phase, answer);

  return (
    <section className={styles.talk} data-phase={phase} data-demo={demo || undefined} data-testid="talk">
      <div className="visually-hidden" role="status" aria-live="polite" data-testid="talk-live">
        {live}
      </div>

      <div className={styles.stage}>
        {phase === 'listening' && (
          <>
            <p className={`${styles.pill} ${styles.listeningPill}`} data-testid="talk-listening">
              <span className={styles.dot} aria-hidden="true" />
              {t('talk.listening')}
            </p>
            <p className={styles.transcript} data-testid="talk-transcript" aria-hidden="true">
              {transcript}
            </p>
          </>
        )}
        {phase === 'unheard' && (
          <div className={`${styles.card} glass`} data-testid="talk-unheard">
            <h3 className={styles.cardTitle}>{t('talk.unheard.title')}</h3>
            <p className={styles.cardBody}>{t('talk.unheard.body')}</p>
          </div>
        )}
        {phase === 'thinking' && (
          <div className={styles.thinking} role="presentation" data-testid="talk-thinking">
            <TvStatic className={styles.thinkingStatic} />
            <span>{t('guide.thinking')}</span>
          </div>
        )}
        {phase === 'answering' && last?.role === 'guide' && <AnswerBubble answer={last.answer} animate={!reducedMotion} />}
        {phase === 'idle' && note && (
          <p className={styles.note} data-testid="talk-note">
            {note}
          </p>
        )}
      </div>

      {!busy && (
        <div className={styles.chips} role="group" aria-label={t('talk.suggestions')} onWheel={onWheel} data-testid="talk-chips">
          {chips.map((entry) => (
            <button key={entry.id} type="button" className={styles.chip} onClick={() => ask(pick(entry.q), entry.id)} data-testid={`chip-${entry.id}`}>
              {pick(entry.q)}
            </button>
          ))}
        </div>
      )}

      <form className={styles.bar} onSubmit={onSubmit}>
        <label className="visually-hidden" htmlFor="guide-input">
          {t('guide.input')}
        </label>
        <input
          id="guide-input"
          ref={inputRef}
          className={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('guide.input')}
          autoComplete="off"
          data-testid="guide-input"
        />
        <button
          type="button"
          className={`${styles.mic} ${listening ? styles.recording : ''}`}
          aria-pressed={listening}
          aria-label={listening ? t('talk.mic.stop') : t('talk.mic.start')}
          title={note ?? (listening ? t('talk.mic.stop') : t('talk.mic.start'))}
          disabled={busy || !supported}
          onClick={() => toggleMic(context, locale)}
          data-testid="mic"
        >
          {listening ? <span className={styles.rec} aria-hidden="true" /> : <MicIcon />}
        </button>
        <button type="submit" className={styles.send} aria-label={t('guide.send')} disabled={!text.trim() || busy || listening}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 3 3 10l7 3 3 7z" />
          </svg>
        </button>
      </form>
    </section>
  );
}

function AnswerBubble({ answer, animate }: { answer: GuideAnswer; animate: boolean }) {
  const { t } = useT();
  const body = answer.kind === 'answer' ? answer.text : t('guide.dontKnow');
  const shown = useTypewriter(body, animate);
  const speaker = answer.kind === 'answer' && answer.speaker ? answer.speaker : t('guide.name');
  return (
    <div className={`${styles.bubble} glass`} data-testid="talk-answer">
      <p className={styles.speaker}>{speaker}</p>
      <p className={styles.answer}>
        <span aria-hidden="true">{shown}</span>
        <span className="visually-hidden">{body}</span>
      </p>
      {answer.kind === 'answer' && answer.source && (
        <span className={styles.source}>
          {t('guide.source')}: {answer.source}
        </span>
      )}
    </div>
  );
}

/** One short sentence for screen readers whenever the state changes: listening, stopped, the answer. */
function useLiveMessage(phase: string, answer: GuideAnswer | null) {
  const { t } = useT();
  const [message, setMessage] = useState('');
  const before = useRef(phase);
  useEffect(() => {
    const was = before.current;
    before.current = phase;
    if (phase === 'listening') setMessage(t('talk.listening'));
    else if (phase === 'answering' && answer) setMessage(answer.kind === 'answer' ? `${answer.speaker ?? t('guide.name')}: ${answer.text}` : t('guide.dontKnow'));
    else if (was === 'listening') setMessage(t('talk.stopped'));
  }, [phase, answer, t]);
  return message;
}

function MicIcon() {
  return (
    <svg width="20" height="24" viewBox="0 0 16 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <rect x="4" y="1" width="8" height="13" rx="4" />
      <path d="M1 10a7 7 0 0 0 14 0M8 17v4" />
    </svg>
  );
}
