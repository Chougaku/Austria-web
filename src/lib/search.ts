import { entities } from '../data';
import type { Entity } from '../data/schema';

export type Segment = { text: string; hit: boolean };

export function tokenize(query: string): string[] {
  return query.toLowerCase().split(/[\s　]+/).filter(Boolean);
}

export function matchesTokens(haystack: string, tokens: string[]): boolean {
  const lower = haystack.toLowerCase();
  return tokens.every((t) => lower.includes(t));
}

const ENTITY_WEIGHTS: [(e: Entity) => string, number][] = [
  [(e) => e.name, 100],
  [(e) => e.tags.join(' '), 60],
  [(e) => e.area, 50],
  [(e) => e.summary, 30],
  [(e) => Object.values(e.fields).join(' '), 20],
];

export function scoreEntity(e: Entity, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const parts = ENTITY_WEIGHTS.map(([get, w]) => [get(e).toLowerCase(), w] as const);
  let total = 0;
  for (const t of tokens) {
    let best = 0;
    for (const [s, w] of parts) {
      if (w > best && s.includes(t)) best = w;
    }
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

const RANK_MAX_RESULTS = 40;

/** 已標記的排最前面，其餘依 scoreEntity 分數排序；無查詢字時不濾除、只排序。 */
export function rankEntities(query: string, favIds: ReadonlySet<string>, pool: Entity[] = entities): Entity[] {
  const tokens = tokenize(query);
  return pool
    .map((e) => ({ e, score: tokens.length ? scoreEntity(e, tokens) : 0 }))
    .filter(({ score }) => tokens.length === 0 || score > 0)
    .sort((a, b) => {
      const favA = favIds.has(a.e.id) ? 1 : 0;
      const favB = favIds.has(b.e.id) ? 1 : 0;
      if (favA !== favB) return favB - favA;
      return b.score - a.score;
    })
    .map(({ e }) => e)
    .slice(0, RANK_MAX_RESULTS);
}

export function suggestFoodTypes(query: string): { type: string; count: number }[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const counts = new Map<string, number>();
  for (const e of entities) {
    if (e.category !== '餐廳') continue;
    const type = e.fields['類型'];
    if (!type) continue;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([type]) => matchesTokens(type, tokens))
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

export function makeSegments(text: string, tokens: string[]): Segment[] {
  if (!text || tokens.length === 0) return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const ranges: [number, number][] = [];
  for (const t of tokens) {
    let i = lower.indexOf(t);
    while (i !== -1) {
      ranges.push([i, i + t.length]);
      i = lower.indexOf(t, i + t.length);
    }
  }
  if (ranges.length === 0) return [{ text, hit: false }];
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [ranges[0].slice() as [number, number]];
  for (const r of ranges.slice(1)) {
    const last = merged[merged.length - 1];
    if (r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push(r.slice() as [number, number]);
  }
  const out: Segment[] = [];
  let pos = 0;
  for (const [s, e] of merged) {
    if (s > pos) out.push({ text: text.slice(pos, s), hit: false });
    out.push({ text: text.slice(s, e), hit: true });
    pos = e;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), hit: false });
  return out;
}

const plainCache = new Map<string, string>();

function plainify(md: string): string {
  const cached = plainCache.get(md);
  if (cached !== undefined) return cached;
  const plain = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/[|`*_>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  plainCache.set(md, plain);
  return plain;
}

export function makeSnippet(text: string, tokens: string[], radius = 18): Segment[] | null {
  if (tokens.length === 0) return null;
  const plain = plainify(text);
  const lower = plain.toLowerCase();
  let first = -1;
  let firstLen = 0;
  for (const t of tokens) {
    const i = lower.indexOf(t);
    if (i !== -1 && (first === -1 || i < first)) {
      first = i;
      firstLen = t.length;
    }
  }
  if (first === -1) return null;
  const start = Math.max(0, first - radius);
  const end = Math.min(plain.length, first + firstLen + radius);
  const out: Segment[] = [];
  if (start > 0) out.push({ text: '…', hit: false });
  out.push(...makeSegments(plain.slice(start, end), tokens));
  if (end < plain.length) out.push({ text: '…', hit: false });
  return out;
}
