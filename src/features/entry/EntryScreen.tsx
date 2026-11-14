import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useApp } from '../../app/appStore';
import { useSettings } from '../../app/settingsStore';
import { audio } from '../../audio/AudioManager';
import { useT } from '../../i18n/useT';
import { Logo } from '../../ui/Logo';
import { webglAvailable } from '../../stage/webgl';
import styles from './EntryScreen.module.css';

/**
 * Loading and entry: the real % and the enter button are DOM; the TV itself is the 3D model on the
 * stage behind (static on its screen while loading). On enter the tape slides into it, the screen
 * flickers on showing the salon, and the TV travels to its cabinet in the lobby.
 */
export function EntryScreen({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const { progress } = useProgress();
  const ready = useApp((s) => s.lobbyReady);
  const failed = useApp((s) => s.stageFailed) || !webglAvailable;
  const go = useApp((s) => s.go);
  const setMuted = useSettings((s) => s.setMuted);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const [leaving, setLeaving] = useState(false);
  const [fading, setFading] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  const percent = ready ? 100 : Math.min(99, Math.round(progress));

  useEffect(() => {
    if (ready) button.current?.focus();
  }, [ready]);

  const enter = async () => {
    setLeaving(true);
    await audio.unlock();
    setMuted(false);
    audio.setMuted(false);
    const app = useApp.getState();
    if (reducedMotion) {
      go({ name: 'lobby' });
      onDone();
      return;
    }
    app.setEntryPhase('insert');
    audio.tapeInsert();
    await wait(1000);
    app.setEntryPhase('on');
    audio.static(0.5);
    await wait(650);
    go({ name: 'lobby' });
    app.setEntryPhase(null);
    setFading(true);
  };

  return (
    <section
      className={`${styles.entry} ${leaving ? styles.leaving : ''} ${fading ? styles.fading : ''}`}
      onAnimationEnd={(e) => e.target === e.currentTarget && fading && onDone()}
      aria-labelledby="entry-title"
    >
      <h1 id="entry-title" className="visually-hidden">
        زوايا الوطنية · Wataniya Zawaya
      </h1>
      <div className={styles.logo}>
        <Logo />
      </div>
      <div className={styles.tvSpace} aria-hidden="true" />
      <div className={styles.status} aria-live="polite">
        {failed ? (
          <>
            <p className={styles.failed} role="alert">
              {t('entry.no3d')}
            </p>
            <p className={styles.hint}>{t('entry.no3dHint')}</p>
          </>
        ) : ready ? (
          <>
            <button ref={button} type="button" className={styles.enter} onClick={enter} disabled={leaving} data-testid="enter">
              {t('entry.enter')}
            </button>
            <p className={styles.hint}>
              <MutedIcon />
              {t('entry.soundHint')}
            </p>
          </>
        ) : (
          <>
            <p className={styles.percent} dir="ltr">
              {percent}%
            </p>
            <div className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t('entry.progress')}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <p className={styles.hint}>{t('entry.loading')}</p>
          </>
        )}
      </div>
    </section>
  );
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function MutedIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 22 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 1 5 5H1v6h4l5 4z" />
      <path d="m15 5 6 6m0-6-6 6" />
    </svg>
  );
}
