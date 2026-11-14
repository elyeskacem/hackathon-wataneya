import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../app/settingsStore';
import { useT } from '../i18n/useT';
import { xrStore } from '../stage/Stage';
import styles from './SettingsMenu.module.css';

/** Menu panel: effects, reduced motion, fullscreen, Enter VR (only with a headset), language. */
export function SettingsMenu({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const { effects, reducedMotion, locale, toggleEffects, toggleReducedMotion, setLocale } = useSettings();
  const [vrSupported, setVrSupported] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    navigator.xr
      ?.isSessionSupported('immersive-vr')
      .then(setVrSupported)
      .catch(() => setVrSupported(false));
    panel.current?.querySelector<HTMLElement>('button, [role=switch]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  return (
    <div ref={panel} className={`${styles.menu} glass`} role="dialog" aria-label={t('settings.title')}>
      <Switch label={t('settings.effects')} checked={effects} onChange={toggleEffects} />
      <Switch label={t('settings.reducedMotion')} checked={reducedMotion} onChange={toggleReducedMotion} />
      <button type="button" className={styles.item} onClick={fullscreen}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
        {t('settings.fullscreen')}
      </button>
      {vrSupported && (
        <button type="button" className={styles.item} onClick={() => void xrStore.enterVR()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 7h18v10h-6l-3-3-3 3H3z" />
          </svg>
          {t('settings.enterVr')}
        </button>
      )}
      <button type="button" className={styles.item} onClick={() => setLocale(locale === 'ar' ? 'fr' : 'ar')} lang={locale === 'ar' ? 'fr' : 'ar'}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
        {t('settings.language')}
      </button>
    </div>
  );
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className={styles.item} onClick={onChange}>
      <span className={`${styles.switch} ${checked ? styles.on : ''}`} aria-hidden="true" />
      {label}
    </button>
  );
}
