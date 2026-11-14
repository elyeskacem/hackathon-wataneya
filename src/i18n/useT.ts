import { useCallback, useEffect } from 'react';
import ar from './ar.json';
import fr from './fr.json';
import { useSettings, type Locale } from '../app/settingsStore';

export type MessageKey = keyof typeof ar;
export type Localized = Record<Locale, string>;

const messages: Record<Locale, Record<MessageKey, string>> = { ar, fr };

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const template = messages[locale][key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

export function useT() {
  const locale = useSettings((s) => s.locale);
  const t = useCallback((key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars), [locale]);
  const pick = useCallback((value: Localized) => value[locale], [locale]);
  return { t, pick, locale };
}

/** Keeps <html lang/dir> in sync with the chosen locale (Arabic RTL by default). */
export function useDocumentLocale() {
  const locale = useSettings((s) => s.locale);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);
}
