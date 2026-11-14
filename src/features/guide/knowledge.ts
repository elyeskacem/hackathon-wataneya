import raw from '../../../data/guide-knowledge.json';
import type { GuideContext, KnowledgeEntry } from './types';

const data = raw as unknown as { contexts: Record<GuideContext, { chips: string[] }>; entries: KnowledgeEntry[]; demo: string[] };

export const entries = data.entries;

/** Entries the scripted demo mode asks, in order. */
export const demoEntries = data.demo.map((id) => entries.find((e) => e.id === id)).filter((e): e is KnowledgeEntry => Boolean(e));

export function entryById(id: string): KnowledgeEntry | undefined {
  return entries.find((e) => e.id === id);
}

/** Three suggestion chips shown before the first question in each context. */
export function chipsFor(context: GuideContext): KnowledgeEntry[] {
  return data.contexts[context].chips.map(entryById).filter((e): e is KnowledgeEntry => Boolean(e));
}

/** Lower-case; strip diacritics and tatweel; unify alef forms, ya and ta marbuta, so spoken and typed text match keywords. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/ـ/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[’`]/g, "'")
    .trim();
}
