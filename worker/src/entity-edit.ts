// 從儀表板編輯餐廳／景點／購物：只改使用者動過的欄位，其他照原樣留著——
// vault 裡的檔可能是在 Obsidian 手寫的（交通、營業時間、評分……），不能整份重寫。
import { ADDABLE, type AddableCategory } from './entity';
import { IMAGE_FILE, fileName, oneLine } from './text';

/** 可以改的欄位；undefined＝沒動，空字串＝清掉。 */
export type EntityChanges = {
  name?: string; type?: string; city?: string; location?: string; address?: string;
  ticket?: string; price?: string; summary?: string;
};
export type EntityEdit = {
  id: string; category: AddableCategory; changes: EntityChanges;
  /** 要從內文拿掉的圖（vault 裡的寫法：檔名或網址） */
  removeImages: string[];
  /** 新上傳的圖，接在「## 照片」段落 */
  addImages: string[];
};

const LIMITS: [keyof EntityChanges, string, number][] = [
  ['name', '名稱', 80], ['type', '類型', 40], ['city', '城市', 20], ['location', '位置', 60],
  ['address', '地址', 160], ['ticket', '門票', 80], ['price', '價位', 40], ['summary', '簡介', 600],
];
export const MAX_IMAGES = 10;

/** 驗證編輯請求；不合格回一句原因。 */
export function parseEntityEdit(body: unknown): EntityEdit | string {
  if (!body || typeof body !== 'object') return '資料格式不對';
  const b = body as Record<string, unknown>;
  const id = typeof b.id === 'string' ? b.id : '';
  const slash = id.indexOf('/');
  const category = id.slice(0, slash) as AddableCategory;
  const name = id.slice(slash + 1);
  if (slash < 0 || !ADDABLE.includes(category)) return '只能編輯餐廳、景點或購物';
  if (!name || /[\\/]/.test(name) || name.includes('..') || name === `${category}總覽`) return '名稱不對';

  const raw = (b.changes && typeof b.changes === 'object' ? b.changes : {}) as Record<string, unknown>;
  const changes: EntityChanges = {};
  for (const [key, label, max] of LIMITS) {
    if (raw[key] === undefined) continue;
    const v = oneLine(raw[key]);
    if (v.length > max) return `${label}太長（最多 ${max} 字）`;
    changes[key] = v;
  }
  if (changes.name !== undefined && !fileName(changes.name)) return '名稱不能是空的或只有符號';

  const list = (v: unknown) => (Array.isArray(v) ? v : v === undefined ? [] : null);
  const removeImages = list(b.removeImages);
  const addImages = list(b.addImages);
  if (!removeImages || !addImages) return '圖片清單格式不對';
  if (!removeImages.every((f) => typeof f === 'string' && f && f.length <= 300 && !/[\n\]]/.test(f))) return '要刪的圖片不對';
  if (!addImages.every((f) => typeof f === 'string' && IMAGE_FILE.test(f))) return '圖片檔名不對';
  if (addImages.length > MAX_IMAGES) return `圖片最多 ${MAX_IMAGES} 張`;
  return { id, category, changes, removeImages: removeImages as string[], addImages: addImages as string[] };
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** frontmatter 某個 key 換成新值（單行），沒有就補上。 */
function setYaml(fm: string, key: string, value: string): string {
  const re = new RegExp(`^${esc(key)}:.*$`, 'm');
  return re.test(fm) ? fm.replace(re, `${key}: ${value}`) : `${fm.replace(/\n*$/, '')}\n${key}: ${value}`;
}

/** 段落的起訖（行號）：從 heading 那行到下一個 `## ` 之前。 */
function section(lines: string[], heading: string): [number, number] | null {
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end < 0) end = lines.length;
  return [start, end];
}

/** 開頭那段簡介（網站卡片上那段）：有就換掉（空字串＝刪掉），沒有就補在最前面。 */
function setSummary(body: string, summary: string): string {
  const lines = body.split('\n');
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  const startsWithText = i < lines.length && !lines[i].startsWith('#');
  let j = i;
  if (startsWithText) while (j < lines.length && lines[j].trim()) j++;
  const text = summary.replace(/^#+\s*/, '');
  const replacement = text ? [text, ''] : [];
  // 換掉原本那段（連同後面一個空行），或插在第一個標題前面
  const removeCount = startsWithText ? j - i + (lines[j] === '' ? 1 : 0) : 0;
  lines.splice(i, removeCount, ...replacement);
  return lines.join('\n');
}

const INFO_KEYS: [keyof EntityChanges, string][] = [['type', '類型'], ['price', '價位'], ['address', '地址'], ['location', '位置'], ['ticket', '門票']];

/** `## 基本資訊` 底下的「- 欄位：值」：有動的才改，空字串就刪那行；其他行（評分、營業時間…）不動。 */
function setInfo(body: string, changes: EntityChanges): string {
  const todo = INFO_KEYS.filter(([k]) => changes[k] !== undefined);
  if (todo.length === 0) return body;
  const lines = body.split('\n');
  if (!section(lines, '## 基本資訊')) {
    if (todo.every(([k]) => !changes[k])) return body;
    // 沒有這段：插在第一個「## 」標題前面（簡介之後），都沒有標題就放最後
    let at = lines.findIndex((l) => /^## /.test(l));
    if (at < 0) {
      if (lines.length && lines[lines.length - 1].trim()) lines.push('');
      at = lines.length;
    }
    lines.splice(at, 0, '## 基本資訊', '');
  }
  for (const [k, label] of todo) {
    const value = changes[k]!;
    const [start, end] = section(lines, '## 基本資訊')!;
    const idx = lines.findIndex((l, i) => i > start && i < end && new RegExp(`^- ${esc(label)}[：:]`).test(l.trim()));
    if (idx >= 0) {
      if (value) lines[idx] = `- ${label}：${value}`;
      else lines.splice(idx, 1);
    } else if (value) {
      let last = start;
      for (let i = start + 1; i < end; i++) if (lines[i].trim().startsWith('- ')) last = i;
      lines.splice(last + 1, 0, `- ${label}：${value}`);
    }
  }
  return lines.join('\n');
}

/** 拿掉某張圖的所有寫法：![[檔名]]、![[檔名|尺寸]]、![說明](檔名)。 */
function removeImage(body: string, file: string): string {
  const f = esc(file);
  const pat = `(?:!\\[\\[${f}(?:[|#][^\\]]*)?\\]\\]|!\\[[^\\]]*\\]\\(${f}\\))`;
  return body
    .replace(new RegExp(`^[ \\t]*${pat}[ \\t]*\\n`, 'gm'), '') // 獨佔一行的：整行拿掉
    .replace(new RegExp(pat, 'g'), ''); // 夾在文字裡的
}

/** 新照片接在「## 照片」段落最後；沒有這段就補一段（放在「## 來源」前面，沒有就放最後）。 */
function addImages(body: string, files: string[]): string {
  if (files.length === 0) return body;
  const lines = body.split('\n');
  const embeds = files.map((f) => `![[${f}]]`);
  const sec = section(lines, '## 照片');
  if (sec) {
    let last = sec[0];
    for (let i = sec[0] + 1; i < sec[1]; i++) if (lines[i].trim()) last = i;
    lines.splice(last + 1, 0, ...embeds);
  } else {
    const src = lines.findIndex((l) => l.trim() === '## 來源');
    const at = src >= 0 ? src : lines.length;
    const block = ['## 照片', ...embeds, ''];
    if (at > 0 && lines[at - 1]?.trim()) block.unshift('');
    lines.splice(at, 0, ...block);
  }
  return lines.join('\n');
}

/** 「## 照片」段落裡已經沒圖了就把標題也拿掉。 */
function dropEmptyPhotos(body: string): string {
  const lines = body.split('\n');
  const sec = section(lines, '## 照片');
  if (!sec || lines.slice(sec[0] + 1, sec[1]).some((l) => l.trim())) return body;
  lines.splice(sec[0], sec[1] - sec[0]);
  return lines.join('\n');
}

/** 把編輯套到整份 markdown（含 frontmatter）。換行一律轉成 LF。 */
export function applyEntityEdit(md: string, edit: Pick<EntityEdit, 'changes' | 'removeImages' | 'addImages'>, today: string): string {
  const src = md.replace(/\r\n/g, '\n');
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  let fm = m ? m[1] : '';
  let body = m ? src.slice(m[0].length) : src;
  const c = edit.changes;
  if (c.name !== undefined) fm = setYaml(fm, 'title', JSON.stringify(c.name));
  fm = setYaml(fm, 'updated', today);
  if (c.summary !== undefined) body = setSummary(body, c.summary);
  body = setInfo(body, c);
  for (const f of edit.removeImages) body = removeImage(body, f);
  body = addImages(dropEmptyPhotos(body), edit.addImages);
  body = dropEmptyPhotos(body).replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
  return `---\n${fm.replace(/^\n+/, '')}\n---\n${body.startsWith('\n') ? body : `\n${body}`}`.replace(/\n*$/, '\n');
}

/** 改名後的 id（檔名跟著名稱走）；沒改名回原本的。 */
export const editedId = (edit: EntityEdit) =>
  edit.changes.name !== undefined ? `${edit.category}/${fileName(edit.changes.name)}` : edit.id;
