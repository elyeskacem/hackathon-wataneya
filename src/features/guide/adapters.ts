import { config } from '../../config';
import { chipsFor, entries, entryById, normalize } from './knowledge';
import type { GuideAdapter, GuideAnswer, GuideQuestion, KnowledgeEntry } from './types';

/** Answers only from data/guide-knowledge.json; unverified entries are never shown. */
export const localAdapter: GuideAdapter = {
  async ask(question) {
    const entry = question.entryId ? entryById(question.entryId) : match(question.text);
    if (!entry || entry.status !== 'verified') return dontKnow(question);
    const { locale } = question;
    return {
      kind: 'answer',
      text: entry.a[locale],
      more: entry.more?.[locale],
      source: entry.source?.[locale] ?? null,
      year: entry.year,
      action: entry.action,
      followUps: entry.followUps.slice(0, 2),
    };
  },
};

function match(text: string): KnowledgeEntry | undefined {
  const q = normalize(text);
  if (!q) return undefined;
  let best: { entry: KnowledgeEntry; score: number } | undefined;
  for (const entry of entries) {
    const score = entry.keywords.reduce((s, k) => (q.includes(normalize(k)) ? s + normalize(k).length : s), 0);
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }
  return best?.entry;
}

function dontKnow(question: GuideQuestion): GuideAnswer {
  return { kind: 'dont-know', suggestions: chipsFor(question.context).filter((e) => e.status === 'verified').slice(0, 2).map((e) => e.id) };
}

/**
 * Server-side LLM endpoint (VITE_GUIDE_ENDPOINT). The server owns the API key and must answer
 * from the archive only; any answer without a source is downgraded to "I don't know" here too.
 */
export function remoteAdapter(endpoint: string): GuideAdapter {
  return {
    async ask(question) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(question),
      });
      if (!res.ok) throw new Error(`Guide endpoint ${res.status}`);
      const answer = (await res.json()) as GuideAnswer;
      if (answer.kind === 'answer' && !answer.source) return dontKnow(question);
      return answer;
    },
  };
}

export const guideAdapter: GuideAdapter = config.guideEndpoint ? remoteAdapter(config.guideEndpoint) : localAdapter;
