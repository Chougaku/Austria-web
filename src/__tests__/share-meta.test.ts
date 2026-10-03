import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

// 分享到 LINE／Facebook 時讀的是 index.html 的 og 標籤；爬蟲不跑 JS，也不會幫相對路徑補網域。
const html = readFileSync('index.html', 'utf8');
const meta = (key: string) => html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1];

describe('分享預覽 og 標籤', () => {
  it('og:image 是完整網址，而且圖真的放在 public/', () => {
    const img = meta('og:image');
    expect(img).toMatch(/^https:\/\/chougaku\.github\.io\/Austria-web\/[\w-]+\.jpg$/);
    expect(existsSync(`public/${img!.split('/').pop()}`)).toBe(true);
  });

  it('有標題與描述——沒有描述時 LINE 只會顯示「點選此處以開啟此連結」', () => {
    expect(meta('og:title')).toBe('奧地利旅券 ÖSTERREICH · BAYERN');
    expect(meta('og:description')).toBeTruthy();
    expect(meta('og:url')).toBe('https://chougaku.github.io/Austria-web/');
  });
});
