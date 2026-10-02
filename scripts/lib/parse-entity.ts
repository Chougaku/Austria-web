import matter from 'gray-matter';
import { EntitySchema, type Entity } from '../../src/data/schema';
import { stripWikilinks, extractArea } from './text';
import { embedsToImageMarkdown } from './guide-images';

export function parseEntity(
  category: Entity['category'],
  filename: string,
  raw: string,
): Entity {
  const id = `${category}/${filename.replace(/\.md$/, '')}`;
  try {
    const { data, content } = matter(raw);
    const body = stripWikilinks(embedsToImageMarkdown(content.trim()));

    const fields: Record<string, string> = {};
    const section = body.match(/## 基本資訊\n([\s\S]*?)(?=\n## |$)/);
    if (section) {
      for (const line of section[1].split('\n')) {
        const m = line.match(/^- (.+?)[：:]\s*(.*)$/);
        if (m) fields[m[1].trim()] = m[2].trim();
      }
    }

    let rating: number | null = null;
    const rawRating = fields['評分'];
    if (rawRating && !['N/A', '-', '—', ''].includes(rawRating)) {
      rating = Number.parseFloat(rawRating);
      if (Number.isNaN(rating)) throw new Error(`評分不是數字：「${rawRating}」`);
    }

    const paragraphs = body.split(/\n{2,}/);
    const summary = paragraphs.find((p) => p.trim() && !p.startsWith('#'))?.trim() ?? '';

    const tags: string[] = Array.isArray(data.tags) ? data.tags.map(String) : [];
    const title = String(data.title ?? '').trim();
    // 區域來源由明確到推測排序：位置欄 → 店名（常帶地名，如「Café Sacher Salzburg」）→ 交通／備註
    // → 標籤 → 內文的「## 交通」段落（多半寫「Karlsplatz 站步行 5 分」這種最近地標）。
    const transport = body.match(/## 交通\n([\s\S]*?)(?=\n## |$)/)?.[1] ?? '';
    const location = `${fields['位置'] ?? ''} ${fields['區域'] ?? ''} ${fields['地址'] ?? ''}`;
    const area = extractArea(location, title,
      `${fields['交通'] ?? ''} ${fields['備註'] ?? ''}`, tags.join(' '), transport);

    return EntitySchema.parse({
      id,
      category,
      name: title || raiseMissingTitle(),
      tags,
      updated: data.updated ? String(data.updated) : '',
      favorite: data.favorite === true,
      fields,
      summary,
      body,
      area,
      rating,
    });
  } catch (err) {
    throw new Error(`[${id}] 解析失敗：${err instanceof Error ? err.message : err}`);
  }
}

function raiseMissingTitle(): never {
  throw new Error('frontmatter 缺 title');
}