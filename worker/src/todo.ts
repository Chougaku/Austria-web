// 從儀表板新增出發前待辦：在行程筆記的 `## ✅ 待辦` 段落最後補一行 `- [ ] …`。
// 格式要讓 scripts/lib/parse-todos.ts 讀得懂；勾選狀態另存 D1，這裡只管清單本身。
import { oneLine } from './text';

/** vault 裡放待辦的檔（跟 scripts/build-data.ts 的 TODO_FILE 同一個）。 */
export const TODO_PATH = 'Austria Trip/行程筆記.md';
const MAX = 120;

export function parseTodoText(body: unknown): string | { error: string } {
  const text = oneLine((body as { text?: unknown } | null)?.text);
  if (!text) return { error: '請填待辦內容' };
  if (text.length > MAX) return { error: `待辦太長（最多 ${MAX} 字）` };
  return text;
}

/** 把新待辦接在段落裡最後一個勾選框後面；同一句已經在清單裡回 null。沒有待辦段落就在檔尾補一段。 */
export function insertTodo(md: string, text: string): string | null {
  const lines = md.split('\n');
  const head = lines.findIndex((l) => /^## ✅ 待辦/.test(l));
  if (head < 0) return `${md.replace(/\n*$/, '\n')}\n## ✅ 待辦\n\n- [ ] ${text}\n`;
  let end = lines.findIndex((l, i) => i > head && /^## /.test(l));
  if (end < 0) end = lines.length;
  let last = -1;
  for (let i = head + 1; i < end; i++) {
    const m = lines[i].trim().match(/^- \[( |x)\] (.+)$/);
    if (!m) continue;
    if (m[2].trim() === text) return null;
    last = i;
  }
  const at = last >= 0 ? last + 1 : head + 1;
  lines.splice(at, 0, ...(last >= 0 ? [] : ['']), `- [ ] ${text}`);
  return lines.join('\n');
}
