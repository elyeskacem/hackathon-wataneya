// Fails (exit 1) when any language misses a translation. Run by `npm run build` and `npm run check:i18n`.
//  - src/i18n/<lang>.json must have exactly the keys of ar.json (Arabic is the source), none empty
//  - every localized field in data/moments.json and data/guide-knowledge.json must exist in all four languages
//  - every placeholder like {name} must appear in every language of a message
import { readFileSync } from 'node:fs';

const LANGS = ['ar', 'fr', 'en', 'zh'];
const load = (p) => JSON.parse(readFileSync(p, 'utf8'));
const problems = [];
const fail = (msg) => problems.push(msg);

const ui = Object.fromEntries(LANGS.map((l) => [l, load(`src/i18n/${l}.json`)]));
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
for (const key of Object.keys(ui.ar)) {
  for (const l of LANGS) {
    const v = ui[l][key];
    if (typeof v !== 'string' || !v.trim()) fail(`src/i18n/${l}.json: missing or empty "${key}"`);
    else if (placeholders(v) !== placeholders(ui.ar[key])) fail(`src/i18n/${l}.json: "${key}" has different {placeholders} than Arabic`);
  }
}
for (const l of LANGS) for (const key of Object.keys(ui[l])) if (!(key in ui.ar)) fail(`src/i18n/${l}.json: "${key}" is not in ar.json`);

/** A localized object is one whose keys are language codes. */
const isLocalized = (v) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).some((k) => LANGS.includes(k));
function walk(node, path, where) {
  if (isLocalized(node)) {
    for (const l of LANGS) {
      const v = node[l];
      const ok = Array.isArray(v) ? v.length > 0 && v.every((x) => typeof x === 'string' && x.trim()) : typeof v === 'string' && v.trim();
      if (!ok) fail(`${where}: ${path} has no "${l}"`);
    }
    return;
  }
  if (Array.isArray(node)) node.forEach((n, i) => walk(n, `${path}[${i}]`, where));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k, where);
}
walk(load('data/moments.json'), '', 'data/moments.json');
for (const e of load('data/guide-knowledge.json').entries) walk(e, e.id, 'data/guide-knowledge.json');

if (problems.length) {
  console.error(`i18n check failed (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`i18n ok: ${Object.keys(ui.ar).length} UI keys in ${LANGS.join(', ')}; moments and guide knowledge complete`);
