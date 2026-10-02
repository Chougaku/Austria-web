/** 交通頁卡片用：移除「## 基本資訊」標題與其後的項目/空行（遇到圖片/內文/下一個標題即停），
 *  以及「## 來源」到結尾。刻意不吞掉基本資訊後緊接的圖片。 */
export function stripEntityCardBody(body: string): string {
  return body
    .replace(/## 基本資訊\n(?:[ \t]*[-*][^\n]*\n?|[ \t]*\n)*/, '')
    .replace(/## 來源[\s\S]*$/, '');
}
