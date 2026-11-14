import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/appStore';
import { useT } from '../../i18n/useT';
import { chipsFor } from './knowledge';
import { useGuide, type GuideMessage } from './guideStore';
import { HostAvatar } from './HostAvatar';
import { TalkControls } from './TalkControls';
import { useTalk } from './talkStore';
import styles from './Guide.module.css';

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
  const submit = useTalk((s) => s.submit);
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
              void submit(pick(c.q), { entryId: c.id }, 'home', locale);
            }}
          >
            {pick(c.q)}
          </button>
        ))}
      </div>
    </section>
  );
}

function GuidePanel({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const { status, messages } = useGuide();
  const talkPhase = useTalk((s) => s.phase);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // The answer being shown in the talk bubble is not repeated in the history until the bubble is done.
  const shown = talkPhase === 'answering' && messages[messages.length - 1]?.role === 'guide' ? messages.slice(0, -1) : messages;

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' });
  }, [shown.length, status]);

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

      <div ref={log} className={styles.log}>
        <div className={styles.guideMsg}>
          <p>
            <strong>{t('guide.greeting')}</strong> {t('guide.greetingQuestion')}
          </p>
        </div>
        {shown.map((m) => (
          <Message key={m.id} message={m} />
        ))}
        {status === 'unavailable' && (
          <p className={styles.guideMsg} role="alert">
            {t('guide.unavailable')}
          </p>
        )}
      </div>

      <TalkControls inputRef={input} />
    </aside>
  );
}

function Message({ message }: { message: GuideMessage }) {
  const { t } = useT();
  const [showMore, setShowMore] = useState(false);

  if (message.role === 'visitor') return <p className={styles.visitorMsg}>{message.text}</p>;

  const { answer } = message;
  if (answer.kind === 'dont-know') {
    return (
      <div className={styles.guideMsg}>
        <p>{t('guide.dontKnow')}</p>
      </div>
    );
  }
  return (
    <div className={styles.guideMsg}>
      {answer.speaker && <p className={styles.speaker}>{answer.speaker}</p>}
      <p>{answer.text}</p>
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
    </div>
  );
}
