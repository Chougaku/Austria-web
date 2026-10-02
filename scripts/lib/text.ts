/** 區域相關的邏輯已搬到 src/data/areas.ts（建置期與前端共用同一份定義）。 */
export { matchArea as extractArea, AREA_NAMES } from '../../src/data/areas';

export function stripWikilinks(s: string): string {
  return s
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, (_, p: string) => p.split('/').pop() ?? p);
}

export function todoKey(text: string): string {
  let h = 5381;
  for (const ch of text) h = ((h * 33) ^ (ch.codePointAt(0) ?? 0)) >>> 0;
  return 'todo:' + h.toString(16);
}
