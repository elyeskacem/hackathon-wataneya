import { useEffect } from 'react';
import { useApp } from '../../app/appStore';
import { changeScene, insertTape } from '../../app/transitions';
import { channelLabel, displayYear, momentByChannel } from '../../data/moments';
import { useT } from '../../i18n/useT';
import { switchChannel } from './channelSwitch';
import { TapeDrawer } from './TapeDrawer';
import styles from './CustomUI.module.css';

/** Custom mode overlay: lower-third, glass remote, tape drawer, «ادخل للحظة» and keyboard. */
export function CustomUI() {
  const { t, pick } = useT();
  const channel = useApp((s) => s.channel);
  const staticBurst = useApp((s) => s.staticBurst);
  const inserting = useApp((s) => s.inserting);
  const drawerOpen = useApp((s) => s.drawerOpen);
  const setDrawerOpen = useApp((s) => s.setDrawerOpen);
  const moment = momentByChannel(channel);
  const year = displayYear(moment);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const app = useApp.getState();
      if (app.guideOpen || app.inserting || isTyping(e.target)) return;
      if (e.key === 'Escape') {
        if (app.drawerOpen) app.setDrawerOpen(false);
        else void changeScene({ name: 'lobby' });
      } else if (app.drawerOpen) {
        return;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        switchChannel(app.channel + 1);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        switchChannel(app.channel - 1);
      } else if (/^[1-9]$/.test(e.key)) {
        switchChannel(Number(e.key));
      } else if (e.key === 'Enter' && e.target === document.body && !app.staticBurst) {
        void insertTape(momentByChannel(app.channel).id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <div className={`${styles.lowerThird} glass`} aria-live="polite" data-testid="lower-third">
        <span className={styles.ch} dir="ltr">
          <span>CH</span>
          <strong>{channelLabel(channel)}</strong>
        </span>
        <span className={styles.titles}>
          <strong className={styles.title}>{pick(moment.title)}</strong>
          <span className={styles.meta}>
            {year !== null && <bdi>{year} · </bdi>}
            {pick(moment.kind)}
            {!moment.scene && <span className={styles.soon}> · {t('custom.soon')}</span>}
          </span>
        </span>
        <span className={styles.onAir} aria-hidden="true" />
      </div>

      <nav className={`${styles.remote} glass chrome`} aria-label={t('custom.remote')}>
        <div className={styles.screen} dir="ltr">
          <span>CH</span>
          <span>{channelLabel(channel)}</span>
        </div>
        <div className={styles.chRow}>
          <button type="button" className={styles.key} onClick={() => switchChannel(channel - 1)} aria-label={t('custom.chDown')}>
            <Chevron down />
          </button>
          <button type="button" className={styles.key} onClick={() => switchChannel(channel + 1)} aria-label={t('custom.chUp')} data-testid="ch-up">
            <Chevron />
          </button>
        </div>
        <div className={styles.pad} dir="ltr">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.key} ${n === channel ? styles.active : ''}`}
              onClick={() => switchChannel(n)}
              aria-label={t('custom.channel', { n })}
              aria-pressed={n === channel}
              data-testid={`key-${n}`}
            >
              {n}
            </button>
          ))}
        </div>
        <button type="button" className={styles.tapes} onClick={() => setDrawerOpen(true)} data-testid="open-tapes">
          {t('custom.tapes')}
        </button>
      </nav>

      {/* Phones: the remote becomes a bottom bar. */}
      <nav className={`${styles.bar} glass chrome`} aria-label={t('custom.remote')}>
        <button type="button" className={styles.key} onClick={() => switchChannel(channel + 1)} aria-label={t('custom.chUp')}>
          <Chevron />
        </button>
        <span className={styles.barLabel}>
          <bdi dir="ltr">CH {channelLabel(channel)}</bdi>
          <span>{pick(moment.title)}</span>
        </span>
        <button type="button" className={styles.key} onClick={() => switchChannel(channel - 1)} aria-label={t('custom.chDown')}>
          <Chevron down />
        </button>
        <button type="button" className={styles.key} onClick={() => setDrawerOpen(true)} aria-label={t('custom.tapes')}>
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 1h12M5 7h12M5 13h12M1 1h.01M1 7h.01M1 13h.01" />
          </svg>
        </button>
      </nav>

      <button
        type="button"
        className={styles.enter}
        onClick={() => void insertTape(moment.id)}
        disabled={staticBurst || inserting}
        data-testid="enter-moment"
      >
        {t('custom.enter')}
      </button>

      {drawerOpen && <TapeDrawer onClose={() => setDrawerOpen(false)} />}
    </>
  );
}

function Chevron({ down = false }: { down?: boolean }) {
  return (
    <svg width="14" height="8" viewBox="0 0 14 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={down ? 'M1 1l6 6 6-6' : 'M13 7 7 1 1 7'} />
    </svg>
  );
}

const isTyping = (target: EventTarget | null) => target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
