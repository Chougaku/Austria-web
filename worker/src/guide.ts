// 從儀表板新增攻略：在 `原始資料/別人行程/` 建一篇 markdown。
// 格式要讓 scripts/lib/parse-guide.ts 讀得懂：標題就是檔名，frontmatter 的 source 是原文網址、author 是顯示名。
import { fileName, imageEmbeds, oneLine, parseImageList, tooLong } from './text';

export const GUIDE_DIR = '原始資料/別人行程';

export type NewGuide = { title: string; author: string; url: string; body: string; images: string[] };
export const MAX_GUIDE_IMAGES = 10;

const LIMITS: [Exclude<keyof NewGuide, 'images'>, string, number][] = [
  ['title', '標題', 60], ['author', '作者', 60], ['url', '網址', 500], ['body', '內容', 20000],
];

export function parseNewGuide(body: unknown): NewGuide | string {
  if (!body || typeof body !== 'object') return '資料格式不對';
  const b = body as Record<string, unknown>;
  const g: NewGuide = {
    title: oneLine(b.title),
    author: oneLine(b.author),
    url: oneLine(b.url),
    // 內容是 markdown，保留換行
    body: typeof b.body === 'string' ? b.body.replace(/\r\n?/g, '\n').trim() : '',
    images: [],
  };
  if (!g.title) return '請填標題';
  if (!g.body) return '請填內容';
  if (g.url && !/^https?:\/\/\S+$/i.test(g.url)) return '網址要以 http:// 或 https:// 開頭';
  const images = parseImageList(b.images, MAX_GUIDE_IMAGES);
  if (typeof images === 'string') return images;
  g.images = images;
  const { images: _, ...text } = g;
  const long = tooLong(text, LIMITS);
  if (long) return long;
  if (!fileName(g.title)) return '標題不能只有符號';
  return g;
}

export function guideMarkdown(g: NewGuide, today: string): string {
  return [
    '---',
    ...(g.author ? [`author: ${JSON.stringify(g.author)}`] : []),
    ...(g.url ? [`source: ${JSON.stringify(g.url)}`] : []),
    `created: ${today}`,
    '---',
    '',
    g.body,
    '',
    // 圖片接在內文後面，一張一行
    ...(g.images.length ? [...imageEmbeds(g.images), ''] : []),
  ].join('\n');
}
