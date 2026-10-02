import matter from 'gray-matter';
import { GuideSchema, type Guide } from '../../src/data/schema';
import { stripWikilinks } from './text';

/** 解析 `原始資料/別人行程/*.md`：標題取檔名，來源取 frontmatter 或內文 `> 來源：`。 */
export function parseGuide(filename: string, raw: string): Guide {
  const id = filename.replace(/\.md$/, '');
  const { data, content } = matter(raw);
  const body = stripWikilinks(content.trim());

  let source = '';
  let sourceUrl = '';

  // 1) frontmatter：source（URL）＋ author（顯示名）
  if (typeof data.source === 'string' && data.source.trim()) {
    sourceUrl = data.source.trim();
  }
  const author = Array.isArray(data.author) ? data.author[0] : data.author;
  if (author) source = stripWikilinks(String(author)).trim();

  // 2) 內文第一行 `> 來源：…`
  if (!source || !sourceUrl) {
    const m = content.match(/^>\s*來源[：:]\s*(.+)$/m);
    if (m) {
      const line = m[1].trim();
      const link = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (link) {
        if (!source) source = link[1].trim();
        if (!sourceUrl) sourceUrl = link[2].trim();
      } else if (!source) {
        source = stripWikilinks(line);
      }
    }
  }

  // 3) 只有 URL 沒顯示名時，用網域當顯示名
  if (!source && sourceUrl) {
    try { source = new URL(sourceUrl).hostname.replace(/^www\./, ''); } catch { /* 非 URL，略過 */ }
  }

  return GuideSchema.parse({ id, title: id, source, sourceUrl, body });
}
