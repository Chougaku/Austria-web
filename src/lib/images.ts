/** 實體內文裡、網站上真的顯示得出來的圖片（建置後的 vault-img/… 或外部網址），依出現順序；第一張當卡片封面。 */
export function imagesIn(body: string | undefined): string[] {
  if (!body) return [];
  return [...body.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)]
    .map((m) => m[1])
    .filter((src) => /^(https?:\/\/|vault-img\/)/i.test(src));
}
