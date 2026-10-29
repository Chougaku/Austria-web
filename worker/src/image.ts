// 從儀表板上傳圖片：存進 vault 的 assets/，Obsidian 用 ![[檔名]] 嵌入；網站建置時再複製進網站一起發布。

/** 前端會先縮到 1600px、轉 JPEG，正常幾百 KB；這是防呆上限。 */
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const IMAGE_DIR = 'assets';

/** 看檔頭判斷真的是圖片（不信 Content-Type）。 */
export function sniffImage(b: Uint8Array): 'jpg' | 'png' | 'webp' | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b.length > 12 && String.fromCharCode(...b.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...b.subarray(8, 12)) === 'WEBP') return 'webp';
  return null;
}

/** 檔名：上傳日期＋8 碼亂數，例 20261029-3fa9c1d2.jpg（全 vault 不重複，Obsidian 靠檔名找圖）。 */
export function imageFileName(ext: string, date: string, rand: string): string {
  return `${date.replace(/-/g, '')}-${rand.replace(/-/g, '').slice(0, 8).toLowerCase()}.${ext}`;
}
