import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../app/settingsStore';
import { useT, type MessageKey } from '../../i18n/useT';
import styles from './ControlsHint.module.css';

const isTouch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

const CARDS: { title: MessageKey; body: MessageKey; icon: 'look' | 'ring' | 'keys' }[] = [
  { title: 'hint.look.title', body: isTouch ? 'hint.look.bodyTouch' : 'hint.look.body', icon: 'look' },
  { title: 'hint.rings.title', body: 'hint.rings.body', icon: 'ring' },
  { title: 'hint.keys.title', body: 'hint.keys.body', icon: 'keys' },
];

/** First-visit controls hint: one card at a time, remembered on this device. */
export function ControlsHint() {
  const { t } = useT();
  const markHintSeen = useSettings((s) => s.markHintSeen);
  const [index, setIndex] = useState(0);
  const card = CARDS[index]!;
  const last = index === CARDS.length - 1;
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (index > 0) title.current?.focus();
  }, [index]);

  return (
    <section className={`${styles.card} glass`} aria-labelledby="hint-title" data-testid="controls-hint">
      <div className={styles.top}>
        <span className={styles.counter} dir="ltr">
          {t('hint.counter', { n: index + 1, total: CARDS.length })}
        </span>
        <span className={styles.icon} aria-hidden="true">
          <Icon kind={card.icon} />
        </span>
      </div>
      <h2 id="hint-title" ref={title} tabIndex={-1} className={styles.title}>
        {t(card.title)}
      </h2>
      <p className={styles.body}>{t(card.body)}</p>
      <div className={styles.actions}>
        <span className={styles.dots} aria-hidden="true">
          {CARDS.map((c, i) => (
            <span key={c.title} className={i === index ? styles.dotOn : styles.dot} />
          ))}
        </span>
        {!last && (
          <button type="button" className={styles.skip} onClick={markHintSeen}>
            {t('hint.skip')}
          </button>
        )}
        <button type="button" className={styles.next} onClick={() => (last ? markHintSeen() : setIndex(index + 1))} data-testid="hint-next">
          {last ? t('hint.done') : t('hint.next')}
        </button>
      </div>
    </section>
  );
}

function Icon({ kind }: { kind: 'look' | 'ring' | 'keys' }) {
  if (kind === 'look')
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  if (kind === 'ring')
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--memory-gold)" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" fill="var(--memory-gold)" />
      </svg>
    );
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
    </svg>
  );
}
