import { useState } from 'react';
import { useApp } from '../app/appStore';
import { useSettings } from '../app/settingsStore';
import { audio } from '../audio/AudioManager';
import { useT } from '../i18n/useT';
import { IconButton } from './IconButton';
import { Logo } from './Logo';
import { SettingsMenu } from './SettingsMenu';
import styles from './TopBar.module.css';

/** Fixed slots on every screen: menu + sound at top-end, logo (or the way back) at top-start. */
export function TopBar() {
  const { t } = useT();
  const route = useApp((s) => s.route.name);
  const go = useApp((s) => s.go);
  const muted = useSettings((s) => s.muted);
  const setMuted = useSettings((s) => s.setMuted);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleSound = () => {
    setMuted(!muted);
    audio.setMuted(!muted);
  };

  return (
    <header className={`${styles.bar} chrome`}>
      <div className={styles.start}>
        {route === 'lobby' ? (
          <Logo />
        ) : (
          <button type="button" className={`${styles.back} glass`} onClick={() => go({ name: 'lobby' })} data-testid="back-to-lobby">
            <HomeIcon />
            {t('top.back')}
          </button>
        )}
      </div>
      <div className={styles.end}>
        <IconButton label={t('top.menu')} onClick={() => setMenuOpen((o) => !o)} pressed={menuOpen} active={menuOpen}>
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 1h16M1 7h16M1 13h16" />
          </svg>
        </IconButton>
        <IconButton label={muted ? t('top.unmute') : t('top.mute')} onClick={toggleSound} pressed={muted}>
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 1 5 5H1v6h4l5 4z" />
            {muted ? <path d="m15 5 6 6m0-6-6 6" /> : <path d="M14 4.5a5 5 0 0 1 0 7M17 2a9 9 0 0 1 0 12" />}
          </svg>
        </IconButton>
        {menuOpen && <SettingsMenu onClose={() => setMenuOpen(false)} />}
      </div>
    </header>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z" />
    </svg>
  );
}
