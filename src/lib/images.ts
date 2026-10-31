import type { Entity, ImageRef } from '../data/schema';

/** 實體內文裡、網站上真的顯示得出來的圖片（建置後的 vault-img/… 或外部網址），依出現順序；第一張當卡片封面。 */
export function imagesIn(body: string | undefined): string[] {
  if (!body) return [];
  return [...body.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)]
    .map((m) => m[1])
    .filter((src) => /^(https?:\/\/|vault-img\/)/i.test(src));
}

/** 一筆地點的照片（vault 寫法＋網站網址）：建置時算好的 entity.images；沒有就從內文抓（file 只好用網址代替）。 */
export function entityImages(e: Pick<Entity, 'images' | 'body'>): ImageRef[] {
  return e.images ?? imagesIn(e.body).map((url) => ({ file: url, url }));
}

/** 詳細頁的內文：照片已經在上面的照片列了，拿掉「## 照片」整段和內文裡的圖片。 */
export function withoutImages(body: string): string {
  return body
    .replace(/^## 照片[^\n]*\n[\s\S]*?(?=^## |(?![\s\S]))/m, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
