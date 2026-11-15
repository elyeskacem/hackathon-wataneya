import { chipsFor, entries, normalize } from './knowledge';
import type { GuideContext, KnowledgeEntry } from './types';

/**
 * Local intent matching, no server: the transcript (spoken or typed) is normalised, split into tokens
 * and scored against the words of every entry (keywords, the chip question and example phrases, in
 * every language). A token counts for more when few entries use it, and a near miss (spelling, a
 * prefix such as the Arabic article) counts a little less than an exact word.
 */
const MIN_SCORE = 1.8;
const PHRASE_BONUS = 2;
/** The questions suggested in the current scene win a tie with the same question asked in another scene. */
const CONTEXT_BONUS = 0.5;

const HAN = /\p{Script=Han}/u;

/**
 * Words of a sentence. Chinese has no spaces, so each run of Han characters is cut into overlapping
 * pairs (频道, 道怎, …): two sentences about the same thing share pairs. A lone character says too little.
 */
const tokensOf = (text: string) => {
  const out: string[] = [];
  for (const word of normalize(text).replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ')) {
    for (const part of word.match(/\p{Script=Han}+|[^\p{Script=Han}]+/gu) ?? []) {
      if (HAN.test(part)) for (let i = 0; i + 2 <= part.length; i++) out.push(part.slice(i, i + 2));
      else if (part.length > 1) out.push(part);
    }
  }
  return out;
};

const phrasesOf = (e: KnowledgeEntry) => [...Object.values(e.q), ...Object.values(e.examples ?? {}).flat(), ...e.keywords.filter((k) => k.includes(' '))];

const index = entries.map((entry) => {
  const words = new Set<string>();
  for (const text of [...entry.keywords, ...Object.values(entry.q), ...Object.values(entry.examples ?? {}).flat()]) tokensOf(text).forEach((t) => words.add(t));
  return { entry, words: [...words], phrases: phrasesOf(entry).map(normalize) };
});

/** How many entries use each word: rare words say more about the intent. */
const weight = new Map<string, number>();
{
  const df = new Map<string, number>();
  for (const { words } of index) for (const w of words) df.set(w, (df.get(w) ?? 0) + 1);
  for (const [w, n] of df) weight.set(w, Math.log(1 + index.length / n));
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length]!;
}

/** 1 for the same word, a little less for a prefix or a one or two letter slip, 0 otherwise. */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const short = Math.min(a.length, b.length);
  if (short < 4) return 0;
  if (a.includes(b) || b.includes(a)) return 0.8;
  return distance(a, b) <= (short >= 8 ? 2 : 1) ? 0.7 : 0;
}

export interface Match {
  entry: KnowledgeEntry;
  score: number;
}

/**
 * The best entry for a sentence, or undefined when nothing scores above the threshold. Unverified
 * entries compete too, so a question about them is answered "I don't know" instead of with a wrong neighbour.
 */
export function matchIntent(text: string, context?: GuideContext): Match | undefined {
  const local = new Set(context ? chipsFor(context).map((e) => e.id) : []);
  const query = normalize(text);
  const tokens = [...new Set(tokensOf(text))];
  if (!tokens.length) return undefined;
  let best: Match | undefined;
  for (const { entry, words, phrases } of index) {
    let score = 0;
    for (const t of tokens) {
      let top = 0;
      for (const w of words) {
        const s = similarity(t, w) * (weight.get(w) ?? 0);
        if (s > top) top = s;
      }
      score += top;
    }
    if (phrases.some((p) => p.length > (HAN.test(p) ? 3 : 5) && query.includes(p))) score += PHRASE_BONUS;
    if (score >= MIN_SCORE && local.has(entry.id)) score += CONTEXT_BONUS;
    if (score >= MIN_SCORE && (!best || score > best.score)) best = { entry, score };
  }
  return best;
}
