import matter from 'gray-matter';
import { DaySchema, type Day } from '../../src/data/schema';

/** 時段裡的圖片：Obsidian 嵌入 `![[檔名.jpg]]`（可帶 |尺寸）或標準 markdown `![](網址)`。 */
const SLOT_IMAGE = /!\[\[([^\]|#]+?\.(?:png|jpe?g|gif|webp|avif))(?:[|#][^\]]*)?\]\]|!\[[^\]]*\]\(([^)\s]+)\)/gi;

export function parseItinerary(raw: string): Day[] {
  const { content } = matter(raw);
  const days: Day[] = [];
  let cur: Day | null = null;

  for (const line of content.split('\n')) {
    const t = line.trim();
    if (t.startsWith('## ')) {
      const m = t.match(/^## (Day \d+)｜(.+?)｜(.+)$/);
      if (!m) throw new Error(`每日行程：Day 標頭格式錯誤 → 「${t}」（應為 ## Day N｜日期｜主題）`);
      cur = { label: m[1], date: m[2].trim(), theme: m[3].trim(), areas: [], slots: [] };
      days.push(cur);
    } else if (t.startsWith('> 區域')) {
      if (!cur) continue;
      cur.areas = t.replace(/^> 區域[：:]/, '').split('、').map((a) => a.trim()).filter(Boolean);
    } else if (t.startsWith('- ')) {
      if (!cur) continue;
      // 時段後面可以接圖片（`![[檔名.jpg]]` 或 `![](網址)`）：先拆出來，剩下的才是「時段｜標題｜備註」
      const images = [...t.matchAll(SLOT_IMAGE)].map((m) => (m[1] ?? m[2]).trim());
      const rest = t.replace(SLOT_IMAGE, ' ').replace(/[ \t]+/g, ' ').trim();
      const parts = rest.slice(2).split('｜').map((p) => p.trim());
      if (parts.length < 2 || !parts[0] || !parts[1])
        throw new Error(`每日行程：時段格式錯誤 → 「${t}」（應為 - 時段｜標題｜備註）`);
      const pending = parts[1].includes('待安排');
      cur.slots.push({
        time: parts[0], title: parts[1], note: pending ? '' : (parts[2] ?? ''), pending,
        ...(images.length && !pending ? { images: images.map((file) => ({ file, url: file })) } : {}),
      });
    }
  }

  if (days.length === 0) throw new Error('每日行程：找不到任何 "## Day N｜…" 段落');
  return days.map((d) => DaySchema.parse(d));
}