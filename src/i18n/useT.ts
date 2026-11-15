import { useCallback, useEffect } from 'react';
import ar from './ar.json';
import fr from './fr.json';
import en from './en.json';
import zh from './zh.json';
import { isRtl, useSettings, type Locale } from '../app/settingsStore';

export type MessageKey = keyof typeof ar;
/** Text in every language of the site. All four are required: a missing one is a compile error (and `npm run check:i18n` checks the JSON data). */
export type Localized = Record<Locale, string>;

/** Every language must have every key of the Arabic file; a missing key fails `tsc`. */
const messages: Record<Locale, Record<MessageKey, string>> = { ar, fr, en, zh };

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const template = messages[locale][key] ?? messages.en[key] ?? messages.ar[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

/** The text for a language; if data was loaded without it, English and then Arabic stand in. Never invented. */
export function pickLocalized(value: Partial<Localized> & { ar: string }, locale: Locale): string {
  return value[locale] ?? value.en ?? value.ar;
}

export function useT() {
  const locale = useSettings((s) => s.locale);
  const t = useCallback((key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars), [locale]);
  const pick = useCallback((value: Localized) => pickLocalized(value, locale), [locale]);
  return { t, pick, locale };
}

/** Keeps <html lang/dir> in sync with the chosen locale (Arabic RTL by default). */
export function useDocumentLocale() {
  const locale = useSettings((s) => s.locale);
  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : locale;
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
  }, [locale]);
}
