import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useApp } from '../../app/appStore';
import { useSettings } from '../../app/settingsStore';
import { audio } from '../../audio/AudioManager';
import { asset } from '../../data/moments';
import { useT } from '../../i18n/useT';
import { Logo } from '../../ui/Logo';
import { TvStatic } from '../../ui/TvStatic';
import { TV_SCREEN_CLIP } from '../custom/tvGeometry';
import styles from './EntryScreen.module.css';

/**
 * Loading and entry (DOM only): the TV warms up with static while the lobby loads behind it,
 * then shows the living room; the tap unlocks audio and the picture "turns on" into the lobby.
 */
export function EntryScreen({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const { progress } = useProgress();
  const ready = useApp((s) => s.lobbyReady);
  const go = useApp((s) => s.go);
  const setMuted = useSettings((s) => s.setMuted);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const [leaving, setLeaving] = useState(false);
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
    audio.setAmbience('room');
    go({ name: 'lobby' });
    if (reducedMotion) onDone();
  };

  return (
    <section
      className={`${styles.entry} ${leaving ? styles.leaving : ''}`}
      onAnimationEnd={(e) => e.target === e.currentTarget && leaving && onDone()}
      aria-labelledby="entry-title"
    >
      <h1 id="entry-title" className="visually-hidden">
        زوايا الوطنية · Wataniya Zawaya
      </h1>
      <div className={styles.logo}>
        <Logo />
      </div>
      <div className={styles.tv}>
        <img className={styles.tvImage} src={asset('renders/old-tv.webp')} alt="" />
        <div className={styles.screen} style={{ clipPath: TV_SCREEN_CLIP }}>
          {ready ? <img src={asset('renders/lobby-living-room.webp')} alt="" className={styles.room} /> : <TvStatic className={styles.static} />}
        </div>
      </div>
      <div className={styles.status} aria-live="polite">
        {ready ? (
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

function MutedIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 22 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 1 5 5H1v6h4l5 4z" />
      <path d="m15 5 6 6m0-6-6 6" />
    </svg>
  );
}
