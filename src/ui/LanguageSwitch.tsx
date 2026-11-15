import { useSettings } from '../app/settingsStore';
import { LANGUAGES } from '../i18n/languages';
import { useT } from '../i18n/useT';
import styles from './LanguageSwitch.module.css';

/** AR · FR · EN · 中文. The choice is remembered by the settings store (localStorage, guarded against blocked storage). */
export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { t, locale } = useT();
  const setLocale = useSettings((s) => s.setLocale);
  return (
    <div className={`${styles.group} ${className}`} role="radiogroup" aria-label={t('settings.language')} dir="ltr">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          role="radio"
          aria-checked={locale === l.code}
          aria-label={l.name}
          lang={l.htmlLang}
          className={`${styles.option} ${locale === l.code ? styles.on : ''}`}
          onClick={() => setLocale(l.code)}
          data-testid={`lang-${l.code}`}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
