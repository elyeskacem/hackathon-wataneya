import { config } from '../../config';
import { pickLocalized } from '../../i18n/useT';
import { chipsFor, entryById } from './knowledge';
import { matchIntent } from './match';
import type { GuideAdapter, GuideAnswer, GuideQuestion } from './types';

/** Answers only from data/guide-knowledge.json; unverified entries are never shown. */
export const localAdapter: GuideAdapter = {
  async ask(question) {
    const entry = question.entryId ? entryById(question.entryId) : matchIntent(question.text, question.context)?.entry;
    if (!entry || entry.status !== 'verified') return dontKnow(question);
    const { locale } = question;
    return {
      kind: 'answer',
      text: pickLocalized(entry.a, locale),
      speaker: entry.speaker ? pickLocalized(entry.speaker, locale) : null,
      more: entry.more && pickLocalized(entry.more, locale),
      source: entry.source ? pickLocalized(entry.source, locale) : null,
      year: entry.year,
      action: entry.action,
      followUps: entry.followUps.slice(0, 2),
    };
  },
};

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
