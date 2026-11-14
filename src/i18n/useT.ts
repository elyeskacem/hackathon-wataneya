import { useCallback, useEffect } from 'react';
import ar from './ar.json';
import fr from './fr.json';
import en from './en.json';
import zh from './zh.json';
import { isRtl, useSettings, type Locale } from '../app/settingsStore';

export type MessageKey = keyof typeof ar;
/** Arabic is always present; other languages may be missing, and then English, then Arabic, is shown. */
export type Localized = { ar: string } & Partial<Record<Exclude<Locale, 'ar'>, string>>;

const messages: Record<Locale, Partial<Record<MessageKey, string>>> = { ar, fr, en, zh };

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const template = messages[locale][key] ?? messages.en[key] ?? messages.ar[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

/** The text for a language, falling back to English and then Arabic; never invented. */
export function pickLocalized(value: Localized, locale: Locale): string {
  return value[locale as keyof Localized] ?? value.en ?? value.ar;
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
