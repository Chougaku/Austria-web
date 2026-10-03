import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// index.html 開頭那段內嵌腳本：快取的舊網頁要不到已被重建刪掉的 /assets/ 檔案時，自己重抓最新網頁。
const html = readFileSync('index.html', 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)![1];

type Handler = (e: unknown) => void;

function run(storage: Record<string, string> = {}) {
  const listeners: Record<string, Handler> = {};
  const replaced: string[] = [];
  const root = { innerHTML: '', hasChildNodes: () => false };
  const win = { addEventListener: (type: string, fn: Handler) => { listeners[type] = fn; } };
  const doc = { getElementById: () => root, addEventListener: () => {} };
  const loc = { href: 'https://chougaku.github.io/Austria-web/#plan', replace: (u: string) => { replaced.push(u); } };
  const session = {
    getItem: (k: string) => storage[k] ?? null,
    setItem: (k: string, v: string) => { storage[k] = v; },
  };
  new Function('window', 'document', 'location', 'sessionStorage', code)(win, doc, loc, session);
  return { listeners, replaced, root };
}

describe('舊網頁自救（index.html 內嵌腳本）', () => {
  it('自家 /assets/ 的 JS 載不到：帶 ?_r= 換網址重抓，分頁 hash 保留', () => {
    const { listeners, replaced } = run();
    listeners.error({ target: { tagName: 'SCRIPT', src: 'https://chougaku.github.io/Austria-web/assets/index-CxKX2PzD.js' } });
    expect(replaced).toHaveLength(1);
    expect(replaced[0]).toMatch(/^https:\/\/chougaku\.github\.io\/Austria-web\/\?_r=\w+#plan$/);
  });

  it('30 秒內又失敗就不再跳轉，改顯示提示——部署真的壞掉時不能無限重載', () => {
    const { listeners, replaced, root } = run({ 'austria-reload-at': String(Date.now() - 5000) });
    listeners.error({ target: { tagName: 'LINK', href: 'https://chougaku.github.io/Austria-web/assets/index-old.css' } });
    expect(replaced).toHaveLength(0);
    expect(root.innerHTML).toContain('網站剛更新');
  });

  it('Google Fonts 這類外部資源失敗（例如離線）不理會', () => {
    const { listeners, replaced } = run();
    listeners.error({ target: { tagName: 'LINK', href: 'https://fonts.googleapis.com/css2?family=Smythe' } });
    expect(replaced).toHaveLength(0);
  });

  it('頁面開著時網站重建，之後才載入的分段程式失敗（vite:preloadError）也重抓', () => {
    const { listeners, replaced } = run();
    let prevented = false;
    listeners['vite:preloadError']({ preventDefault: () => { prevented = true; } });
    expect(prevented).toBe(true);
    expect(replaced).toHaveLength(1);
  });
});
