import type { Locale } from '../../app/settingsStore';
import type { Localized } from '../../i18n/useT';

export type GuideContext = 'home' | 'custom' | 'choufli-hal' | 'om-kalthoum';

export type GuideAction = { type: 'channel'; channel: number };

export interface KnowledgeEntry {
  id: string;
  status: 'verified' | 'to-verify';
  q: Localized;
  keywords: string[];
  a: Localized;
  more?: Localized;
  action?: GuideAction;
  source: Localized | null;
  year: number | null;
  followUps: string[];
}

export interface GuideQuestion {
  text: string;
  /** Set when the visitor tapped a suggestion chip. */
  entryId?: string;
  context: GuideContext;
  locale: Locale;
}

export type GuideAnswer =
  | {
      kind: 'answer';
      text: string;
      more?: string;
      source: string | null;
      year: number | null;
      action?: GuideAction;
      followUps: string[];
    }
  | { kind: 'dont-know'; suggestions: string[] };

/** Swappable backend for the guide: local knowledge file today, a server-side LLM later. */
export interface GuideAdapter {
  ask: (question: GuideQuestion) => Promise<GuideAnswer>;
}
