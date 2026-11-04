// 從儀表板新增內容時共用的文字整理。

/** 一律收成單行：換行會讓「- 欄位：值」斷掉，也可能在 markdown 裡長出新的 `## ` 段落。 */
export const oneLine = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

/** 檔名：拿掉檔案系統與 Obsidian 連結不能用的字元。 */
export function fileName(name: string): string {
  return name.replace(/[\\/:*?"<>|#^[\]]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '').slice(0, 60).trim();
}

/** 超過長度回一句原因，都沒超過回 null。 */
export function tooLong<T extends Record<string, string>>(v: T, limits: [keyof T, string, number][]): string | null {
  for (const [key, label, max] of limits) if (v[key].length > max) return `${label}太長（最多 ${max} 字）`;
  return null;
}

/** 台灣日期 YYYY-MM-DD */
export const taipeiDate = (now = Date.now()) => new Date(now + 8 * 3600_000).toISOString().slice(0, 10);

/** 二進位轉 base64（GitHub contents API 要 base64）；分段轉，大圖不會撐爆 call stack。 */
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** 上傳圖片後拿到的檔名（見 image.ts 的 imageFileName）；只認這個樣子，免得被塞進奇怪的 markdown。 */
export const IMAGE_FILE = /^\d{8}-[0-9a-f]{8}\.(?:jpg|png|webp)$/;

/** 驗證前端送來的圖片檔名清單；不合格回一句原因。 */
export function parseImageList(v: unknown, max: number): string[] | string {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return '圖片清單格式不對';
  if (v.length > max) return `圖片最多 ${max} 張`;
  if (!v.every((f) => typeof f === 'string' && IMAGE_FILE.test(f))) return '圖片檔名不對';
  return v as string[];
}

/** 同 scripts/lib/text.ts 的 stripWikilinks：網站上看到的待辦文字是去掉 [[ ]] 之後的。 */
export const stripWikilinks = (s: string) =>
  s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, (_, p: string) => p.split('/').pop() ?? p);

/** 同 scripts/lib/text.ts 的 todoKey：待辦勾選狀態在 D1 的 key（文字的雜湊，改字就換 key）。 */
export function todoKey(text: string): string {
  let h = 5381;
  for (const ch of text) h = ((h * 33) ^ (ch.codePointAt(0) ?? 0)) >>> 0;
  return 'todo:' + h.toString(16);
}

/** 評分：0–5，最多一位小數（網站上點星星給的是 1–5 的整數；vault 裡手寫的可能是 4.4）。 */
export const RATING = /^(?:[0-4](?:\.\d)?|5(?:\.0)?)$/;

/** Obsidian 的圖片嵌入，一張一行。 */
export const imageEmbeds = (files: string[]) => files.map((f) => `![[${f}]]`);
