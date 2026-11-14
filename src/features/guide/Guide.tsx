import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useApp } from '../../app/appStore';
import { useSettings } from '../../app/settingsStore';
import { useT } from '../../i18n/useT';
import { TvStatic } from '../../ui/TvStatic';
import { switchChannel } from '../custom/channelSwitch';
import { chipsFor, entryById } from './knowledge';
import { useGuide, type GuideMessage } from './guideStore';
import { HostAvatar } from './HostAvatar';
import type { GuideAction, GuideContext } from './types';
import { useTypewriter } from './useTypewriter';
import styles from './Guide.module.css';

export function useGuideContext(): GuideContext {
  const route = useApp((s) => s.route);
  if (route.name === 'custom') return 'custom';
  if (route.name === 'moment' && (route.momentId === 'choufli-hal' || route.momentId === 'om-kalthoum')) return route.momentId;
  return 'home';
}

/**
 * The AI guide, one component everywhere: a bubble at the bottom-end that opens a side panel
 * (desktop) or bottom sheet (mobile). The visitor calls the guide; it never interrupts.
 */
export function Guide() {
  const { t } = useT();
  const open = useApp((s) => s.guideOpen);
  const setOpen = useApp((s) => s.setGuideOpen);
  const status = useGuide((s) => s.status);

  return (
    <>
      {!open && (
        <button type="button" className={`${styles.bubble} glass chrome`} onClick={() => setOpen(true)} data-testid="guide-bubble">
          <HostAvatar status={status === 'thinking' ? 'thinking' : 'idle'} size={44} />
          <span>{t('guide.ask')}</span>
        </button>
      )}
      {open && <GuidePanel onClose={() => setOpen(false)} />}
    </>
  );
}

/** Lobby greeting card (the guide is "big on Home"): AI disclosure first, then 3 chips. */
export function GuideHomeCard() {
  const { t, pick, locale } = useT();
  const setOpen = useApp((s) => s.setGuideOpen);
  const ask = useGuide((s) => s.ask);
  const chips = chipsFor('home');

  return (
    <section className={`${styles.homeCard} glass chrome`} aria-label={t('guide.name')} data-testid="guide-home">
      <span className={styles.aiTag}>{t('guide.ai')}</span>
      <p className={styles.greeting}>{t('guide.greeting')}</p>
      <p className={styles.question}>{t('guide.greetingQuestion')}</p>
      <div className={styles.chips}>
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            className={styles.chip}
            onClick={() => {
              setOpen(true);
              void ask({ text: pick(c.q), entryId: c.id }, 'home', locale).then((a) => a?.kind === 'answer' && runAction(a.action));
            }}
          >
            {pick(c.q)}
          </button>
        ))}
      </div>
    </section>
  );
}

function runAction(action: GuideAction | undefined) {
  if (!action) return;
  const app = useApp.getState();
  if (app.route.name !== 'custom') app.go({ name: 'custom' });
  // Let the camera start its glide to the TV before the channel flips.
  window.setTimeout(() => switchChannel(action.channel), 600);
}

function GuidePanel({ onClose }: { onClose: () => void }) {
  const { t, pick, locale } = useT();
  const context = useGuideContext();
  const { status, messages, ask } = useGuide();
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, status]);

  const askEntry = (id: string) => {
    const entry = entryById(id);
    if (entry) void ask({ text: pick(entry.q), entryId: id }, context, locale).then((a) => a?.kind === 'answer' && runAction(a.action));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q || status === 'thinking') return;
    setText('');
    void ask({ text: q }, context, locale).then((a) => a?.kind === 'answer' && runAction(a.action));
  };

  return (
    <aside className={`${styles.panel} glass`} aria-label={t('guide.name')} data-testid="guide-panel">
      <header className={styles.header}>
        <HostAvatar status={status} size={48} />
        <div className={styles.who}>
          <p className={styles.name}>
            {t('guide.name')} <span className={styles.aiTag}>{t('guide.ai')}</span>
          </p>
          <p className={styles.role}>{t('guide.role')}</p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label={t('guide.close')}>
          <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M1 1l12 12M13 1 1 13" />
          </svg>
        </button>
      </header>

      <div ref={log} className={styles.log} aria-live="polite">
        <div className={styles.guideMsg}>
          <p>
            <strong>{t('guide.greeting')}</strong> {t('guide.greetingQuestion')}
          </p>
          {messages.length === 0 && <Chips ids={chipsFor(context).map((c) => c.id)} onPick={askEntry} />}
        </div>
        {messages.map((m, i) => (
          <Message key={m.id} message={m} latest={i === messages.length - 1} onPick={askEntry} />
        ))}
        {status === 'thinking' && (
          <div className={styles.thinking} role="status">
            <TvStatic className={styles.thinkingStatic} />
            {t('guide.thinking')}
          </div>
        )}
        {status === 'unavailable' && (
          <p className={styles.guideMsg} role="alert">
            {t('guide.unavailable')}
          </p>
        )}
      </div>

      <form className={styles.form} onSubmit={submit}>
        <label className="visually-hidden" htmlFor="guide-input">
          {t('guide.input')}
        </label>
        <input
          id="guide-input"
          ref={input}
          className={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('guide.input')}
          autoComplete="off"
          data-testid="guide-input"
        />
        <button type="button" className={styles.round} disabled aria-label={t('guide.mic')} title={t('guide.mic')}>
          <svg width="16" height="18" viewBox="0 0 16 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <rect x="4" y="1" width="8" height="13" rx="4" />
            <path d="M1 10a7 7 0 0 0 14 0M8 17v4" />
          </svg>
        </button>
        <button type="submit" className={`${styles.round} ${styles.send}`} aria-label={t('guide.send')} disabled={!text.trim() || status === 'thinking'}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 3 3 10l7 3 3 7z" />
          </svg>
        </button>
      </form>
    </aside>
  );
}

function Message({ message, latest, onPick }: { message: GuideMessage; latest: boolean; onPick: (id: string) => void }) {
  const { t } = useT();
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const [showMore, setShowMore] = useState(false);

  if (message.role === 'visitor') return <p className={styles.visitorMsg}>{message.text}</p>;

  const { answer } = message;
  if (answer.kind === 'dont-know') {
    return (
      <div className={styles.guideMsg}>
        <p>{t('guide.dontKnow')}</p>
        <p className={styles.muted}>{t('guide.dontKnowFollow')}</p>
        {latest && <Chips ids={answer.suggestions} onPick={onPick} />}
      </div>
    );
  }
  return (
    <div className={styles.guideMsg}>
      <Typed text={answer.text} animate={latest && !reducedMotion} />
      {answer.more &&
        (showMore ? (
          <p>{answer.more}</p>
        ) : (
          <button type="button" className={styles.more} onClick={() => setShowMore(true)}>
            {t('guide.more')}
          </button>
        ))}
      {answer.source && (
        <span className={styles.source}>
          {t('guide.source')}: {answer.source}
          {answer.year !== null && <bdi> · {answer.year}</bdi>}
        </span>
      )}
      {latest && <Chips ids={answer.followUps} onPick={onPick} />}
    </div>
  );
}

function Typed({ text, animate }: { text: string; animate: boolean }) {
  const shown = useTypewriter(text, animate);
  return (
    <p>
      <span aria-hidden="true">{shown}</span>
      <span className="visually-hidden">{text}</span>
    </p>
  );
}

function Chips({ ids, onPick }: { ids: string[]; onPick: (id: string) => void }) {
  const { pick } = useT();
  return (
    <div className={styles.chips}>
      {ids.map(entryById).map(
        (entry) =>
          entry && (
            <button key={entry.id} type="button" className={styles.chip} onClick={() => onPick(entry.id)}>
              {pick(entry.q)}
            </button>
          ),
      )}
    </div>
  );
}
