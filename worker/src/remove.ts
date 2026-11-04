// 從儀表板刪除：餐廳／景點／購物、攻略整個檔（連同它從儀表板上傳的照片），或出發前待辦的一行。
// vault 是 git，刪掉的東西還在歷史紀錄裡，真的刪錯可以救回。
import { ADDABLE, type AddableCategory } from './entity';
import { GUIDE_DIR } from './guide';
import { IMAGE_DIR } from './image';
import { IMAGE_FILE, oneLine, stripWikilinks } from './text';

export type DeleteRequest =
  | { kind: 'entity'; id: string; category: AddableCategory; path: string }
  | { kind: 'guide'; id: string; path: string }
  | { kind: 'todo'; text: string };

/** 檔名那段：不能帶路徑、不能是空的。 */
const safeName = (s: string) => !!s && !/[\\/]/.test(s) && !s.includes('..');

/** 驗證刪除請求；不合格回一句原因。 */
export function parseDelete(body: unknown): DeleteRequest | string {
  if (!body || typeof body !== 'object') return '資料格式不對';
  const b = body as Record<string, unknown>;
  if (b.kind === 'todo') {
    const text = oneLine(b.text);
    return text ? { kind: 'todo', text } : '缺待辦內容';
  }
  const id = typeof b.id === 'string' ? b.id : '';
  if (b.kind === 'entity') {
    const slash = id.indexOf('/');
    const category = id.slice(0, slash) as AddableCategory;
    const name = id.slice(slash + 1);
    if (slash < 0 || !ADDABLE.includes(category)) return '只能刪除餐廳、景點或購物';
    if (!safeName(name) || name === `${category}總覽`) return '名稱不對';
    return { kind: 'entity', id, category, path: `wiki/entities/${id}.md` };
  }
  if (b.kind === 'guide') {
    if (!safeName(id)) return '標題不對';
    return { kind: 'guide', id, path: `${GUIDE_DIR}/${id}.md` };
  }
  return '不知道要刪什麼';
}

/** 這篇 markdown 嵌入的、從儀表板上傳的照片（assets/<日期-亂數>.jpg）。別的圖不動——可能是別篇也在用的。 */
export function uploadedImages(md: string): string[] {
  const files = new Set<string>();
  for (const m of md.matchAll(/!\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)) {
    const f = m[1].trim();
    if (IMAGE_FILE.test(f)) files.add(`${IMAGE_DIR}/${f}`);
  }
  return [...files];
}

/** 從 `## ✅ 待辦` 段落拿掉那一句（不管勾了沒）；找不到回 null。 */
export function removeTodo(md: string, text: string): string | null {
  const lines = md.split('\n');
  const head = lines.findIndex((l) => /^## ✅ 待辦/.test(l));
  if (head < 0) return null;
  let end = lines.findIndex((l, i) => i > head && /^## /.test(l));
  if (end < 0) end = lines.length;
  for (let i = head + 1; i < end; i++) {
    const m = lines[i].trim().match(/^- \[( |x)\] (.+)$/);
    if (m && stripWikilinks(m[2].trim()) === text) {
      lines.splice(i, 1);
      return lines.join('\n');
    }
  }
  return null;
}
