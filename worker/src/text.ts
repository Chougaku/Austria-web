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
