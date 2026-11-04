// 從儀表板編輯攻略：標題（＝檔名，改了就換檔名）、作者、原文網址、內文、圖片。
// 內文裡從儀表板上傳的圖（![[日期-亂數.jpg]]）拆出來當「圖片」管理，永遠接在內文最後；其他圖、wikilink 都照原樣留在內文。
import { GUIDE_DIR, MAX_GUIDE_IMAGES } from './guide';
import { IMAGE_FILE, fileName, imageEmbeds, oneLine } from './text';

export type GuideChanges = { title?: string; author?: string; url?: string; body?: string };
export type GuideEdit = { id: string; changes: GuideChanges; removeImages: string[]; addImages: string[] };

/** 拆開攻略檔：frontmatter 的作者／原文網址、內文（不含上傳的圖）、上傳的圖（依出現順序）。 */
export function splitGuide(md: string): { author: string; url: string; body: string; images: string[] } {
  const src = md.replace(/\r\n/g, '\n');
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  const fm = m ? m[1] : '';
  const value = (key: string) => {
    const line = fm.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? '';
    if (!line) return '';
    try { return line.startsWith('"') ? String(JSON.parse(line)) : line.replace(/^'(.*)'$/, '$1'); } catch { return line; }
  };
  const images: string[] = [];
  const body = (m ? src.slice(m[0].length) : src)
    .replace(/^[ \t]*!\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\][ \t]*\n?/gm, (whole, f: string) => {
      if (!IMAGE_FILE.test(f.trim())) return whole;
      images.push(f.trim());
      return '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { author: value('author'), url: value('source'), body, images };
}

/** 驗證編輯請求；不合格回一句原因。 */
export function parseGuideEdit(input: unknown): GuideEdit | string {
  if (!input || typeof input !== 'object') return '資料格式不對';
  const b = input as Record<string, unknown>;
  const id = typeof b.id === 'string' ? b.id : '';
  if (!id || /[\\/]/.test(id) || id.includes('..')) return '標題不對';
  const raw = (b.changes && typeof b.changes === 'object' ? b.changes : {}) as Record<string, unknown>;
  const changes: GuideChanges = {};
  if (raw.title !== undefined) {
    changes.title = oneLine(raw.title);
    if (!fileName(changes.title)) return '標題不能是空的或只有符號';
    if (changes.title.length > 60) return '標題太長（最多 60 字）';
  }
  if (raw.author !== undefined) {
    changes.author = oneLine(raw.author);
    if (changes.author.length > 60) return '作者太長（最多 60 字）';
  }
  if (raw.url !== undefined) {
    changes.url = oneLine(raw.url);
    if (changes.url && !/^https?:\/\/\S+$/i.test(changes.url)) return '網址要以 http:// 或 https:// 開頭';
    if (changes.url.length > 500) return '網址太長（最多 500 字）';
  }
  if (raw.body !== undefined) {
    changes.body = typeof raw.body === 'string' ? raw.body.replace(/\r\n?/g, '\n').trim() : '';
    if (!changes.body) return '請填內容';
    if (changes.body.length > 20000) return '內容太長（最多 20000 字）';
  }
  const list = (v: unknown) => (Array.isArray(v) ? v : v === undefined ? [] : null);
  const removeImages = list(b.removeImages);
  const addImages = list(b.addImages);
  if (!removeImages || !addImages) return '圖片清單格式不對';
  if (![...removeImages, ...addImages].every((f) => typeof f === 'string' && IMAGE_FILE.test(f))) return '圖片檔名不對';
  return { id, changes, removeImages: removeImages as string[], addImages: addImages as string[] };
}

/** frontmatter 某個 key：有值就設（JSON 字串，冒號引號都安全），空字串就拿掉那行。 */
function setYaml(fm: string, key: string, value: string): string {
  const re = new RegExp(`^${key}:.*\\n?`, 'm');
  if (!value) return fm.replace(re, '');
  const line = `${key}: ${JSON.stringify(value)}`;
  return re.test(fm) ? fm.replace(new RegExp(`^${key}:.*$`, 'm'), line) : `${fm.replace(/\n*$/, '')}\n${line}`;
}

/** 把編輯套到整份攻略。上傳的圖：原本的扣掉拿掉的，再接上新的，都放在內文最後。 */
export function applyGuideEdit(md: string, edit: Pick<GuideEdit, 'changes' | 'removeImages' | 'addImages'>): { md: string } | { error: string } {
  const src = md.replace(/\r\n/g, '\n');
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  let fm = m ? m[1] : '';
  const cur = splitGuide(src);
  const c = edit.changes;
  if (c.author !== undefined) fm = setYaml(fm, 'author', c.author);
  if (c.url !== undefined) fm = setYaml(fm, 'source', c.url);
  const images = [...cur.images.filter((f) => !edit.removeImages.includes(f)), ...edit.addImages];
  if (images.length > MAX_GUIDE_IMAGES) return { error: `圖片最多 ${MAX_GUIDE_IMAGES} 張` };
  const body = c.body ?? cur.body;
  return {
    md: [
      ...(fm.trim() ? ['---', fm.replace(/\n+$/, ''), '---', ''] : []),
      body,
      '',
      ...(images.length ? [...imageEmbeds(images), ''] : []),
    ].join('\n'),
  };
}

/** 攻略在 vault 的路徑與改名後的 id。 */
export const guidePath = (id: string) => `${GUIDE_DIR}/${id}.md`;
export const editedGuideId = (edit: GuideEdit) => (edit.changes.title !== undefined ? fileName(edit.changes.title) : edit.id);
