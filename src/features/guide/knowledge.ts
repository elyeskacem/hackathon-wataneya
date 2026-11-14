import raw from '../../../data/guide-knowledge.json';
import type { GuideContext, KnowledgeEntry } from './types';

const data = raw as unknown as { contexts: Record<GuideContext, { chips: string[] }>; entries: KnowledgeEntry[] };

export const entries = data.entries;

export function entryById(id: string): KnowledgeEntry | undefined {
  return entries.find((e) => e.id === id);
}

/** Three suggestion chips shown before the first question in each context. */
export function chipsFor(context: GuideContext): KnowledgeEntry[] {
  return data.contexts[context].chips.map(entryById).filter((e): e is KnowledgeEntry => Boolean(e));
}

/** Lower-case, strip Arabic diacritics and tatweel so typed questions match keywords. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/ـ/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .trim();
}
