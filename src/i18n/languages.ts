import type { Locale } from '../app/settingsStore';

/** The four languages, each named in its own language (never translated), with the short form used in the switch. */
export const LANGUAGES: { code: Locale; short: string; name: string; htmlLang: string }[] = [
  { code: 'ar', short: 'AR', name: 'العربية', htmlLang: 'ar' },
  { code: 'fr', short: 'FR', name: 'Français', htmlLang: 'fr' },
  { code: 'en', short: 'EN', name: 'English', htmlLang: 'en' },
  { code: 'zh', short: '中文', name: '中文', htmlLang: 'zh-CN' },
];
