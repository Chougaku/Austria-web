/** 實體內文裡、網站上真的顯示得出來的圖片（建置後的 vault-img/… 或外部網址），依出現順序；第一張當卡片封面。 */
export function imagesIn(body: string | undefined): string[] {
  if (!body) return [];
  return [...body.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)]
    .map((m) => m[1])
    .filter((src) => /^(https?:\/\/|vault-img\/)/i.test(src));
}

/** 詳細頁的內文：照片已經在上面的照片列了，拿掉「## 照片」整段和內文裡的圖片。 */
export function withoutImages(body: string): string {
  return body
    .replace(/^## 照片[^\n]*\n[\s\S]*?(?=^## |(?![\s\S]))/m, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
