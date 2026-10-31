import { describe, it, expect, vi, afterEach } from 'vitest';
import app from '../src/index';
import { parseDelete, removeTodo, uploadedImages } from '../src/remove';

const env = {
  DB: {} as unknown, DASH_TOKEN: 'secret123', DASH_PASSWORD: 'x',
  GH_OWNER: 'o', GH_REPO: 'r', GH_BRANCH: 'main', GH_ITINERARY_PATH: 'wiki/dashboard/每日行程.md', GITHUB_TOKEN: 'ghtok',
};
const auth = { Authorization: 'Bearer secret123' };
const b64 = (s: string) => { let bin = ''; for (const x of new TextEncoder().encode(s)) bin += String.fromCharCode(x); return btoa(bin); };
const unb64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0)));
const post = (body: unknown, headers: Record<string, string> = auth) => app.request('/api/delete', {
  method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}, env);
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });

afterEach(() => vi.unstubAllGlobals());

describe('刪除要刪什麼', () => {
  it('只收餐廳／景點／購物、攻略的檔名，不能帶路徑、不能刪總覽', () => {
    expect(parseDelete({ kind: 'entity', id: '餐廳/Öfferl - Praterstrasse 26' })).toMatchObject({ path: 'wiki/entities/餐廳/Öfferl - Praterstrasse 26.md' });
    expect(parseDelete({ kind: 'guide', id: '咖啡館清單' })).toMatchObject({ path: '原始資料/別人行程/咖啡館清單.md' });
    expect(parseDelete({ kind: 'todo', text: ' 訂機票 ' })).toEqual({ kind: 'todo', text: '訂機票' });
    for (const id of ['交通/租車', '景點/../../secret', '景點/a/b', '景點/景點總覽', '景點/', 'x']) {
      expect(typeof parseDelete({ kind: 'entity', id })).toBe('string');
    }
    expect(typeof parseDelete({ kind: 'guide', id: '../每日行程' })).toBe('string');
    expect(typeof parseDelete({ kind: 'other', id: 'x' })).toBe('string');
  });

  it('只算從儀表板上傳的照片（別篇可能共用的圖不碰）', () => {
    const md = '## 照片\n![[20261029-3fa9c1d2.jpg]]\n![[20261029-3fa9c1d2.jpg|300]]\n![[我的地圖.png]]\n![](20261029-0b1c2d3e.jpg)';
    expect(uploadedImages(md)).toEqual(['assets/20261029-3fa9c1d2.jpg']);
  });

  it('待辦：勾了的、帶連結的也拿得掉，其他行不動；找不到回 null', () => {
    const md = '## ✅ 待辦\n\n- [ ] 訂機票\n- [x] 辦護照\n- [ ] 預約[[美泉宮]]\n\n## 筆記\n\n- [ ] 辦護照\n';
    expect(removeTodo(md, '辦護照')).toBe(md.replace('- [x] 辦護照\n', ''));
    expect(removeTodo(md, '預約美泉宮')).toBe(md.replace('- [ ] 預約[[美泉宮]]\n', ''));
    expect(removeTodo(md, '不存在')).toBeNull();
  });
});

describe('POST /api/delete', () => {
  it('沒登入不能刪；不合格的請求不碰 GitHub', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await post({ kind: 'entity', id: '景點/x' }, {})).status).toBe(401);
    expect((await post({ kind: 'entity', id: '景點/../x' })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('地點連同還在 assets/ 的照片，一筆 commit 刪掉', async () => {
    const md = '---\ntitle: x\n---\n\n## 照片\n![[20261029-3fa9c1d2.jpg]]\n![[20261029-0b1c2d3e.jpg]]\n';
    const calls: { url: string; method: string; body?: unknown }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: init?.body ? JSON.parse(init.body as string) : undefined });
      if (url.includes('/contents/wiki/')) return json({ content: b64(md), sha: 's' });
      if (url.includes('/contents/assets')) return json([{ path: 'assets/20261029-3fa9c1d2.jpg' }, { path: 'assets/other.jpg' }]);
      if (url.endsWith('/git/ref/heads/main')) return json({ object: { sha: 'head1' } });
      if (url.endsWith('/git/commits/head1')) return json({ tree: { sha: 'tree1' } });
      if (url.endsWith('/git/trees')) return json({ sha: 'tree2' }, 201);
      if (url.endsWith('/git/commits')) return json({ sha: 'commit2' }, 201);
      if (url.endsWith('/git/refs/heads/main')) return json({ object: { sha: 'commit2' } });
      return json({}, 500);
    }));
    const res = await post({ kind: 'entity', id: '餐廳/Öfferl - Praterstrasse 26' });
    expect(res.status).toBe(200);
    const removed = ['wiki/entities/餐廳/Öfferl - Praterstrasse 26.md', 'assets/20261029-3fa9c1d2.jpg'];
    expect(await res.json()).toEqual({ ok: true, removed });
    const tree = calls.find((x) => x.url.endsWith('/git/trees'))!.body as { base_tree: string; tree: { path: string; sha: null }[] };
    expect(tree.base_tree).toBe('tree1');
    expect(tree.tree).toEqual(removed.map((path) => ({ path, mode: '100644', type: 'blob', sha: null })));
    const commit = calls.find((x) => x.url.endsWith('/git/commits') && x.method === 'POST')!.body as { message: string; parents: string[] };
    expect(commit).toMatchObject({ message: 'chore(entity): 從儀表板刪除餐廳「Öfferl - Praterstrasse 26」', parents: ['head1'] });
    expect(calls.at(-1)).toMatchObject({ method: 'PATCH', body: { sha: 'commit2' } });
  });

  it('已經不在了回 404；分支剛被推了新東西回 409', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/git/ref/heads/main')) return json({ object: { sha: 'h' } });
      if (url.includes('/git/commits/')) return json({ tree: { sha: 't' } });
      return json({ message: 'Not Found' }, 404);
    }));
    expect((await post({ kind: 'guide', id: '咖啡館清單' })).status).toBe(404);
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/contents/')) return json({ content: b64('內文'), sha: 's' });
      if (init?.method === 'PATCH') return json({ message: 'Update is not a fast forward' }, 422);
      if (url.endsWith('/git/ref/heads/main')) return json({ object: { sha: 'h' } });
      if (url.includes('/git/commits/')) return json({ tree: { sha: 't' } });
      return json({ sha: 'n' }, 201);
    }));
    expect(await (await post({ kind: 'guide', id: '咖啡館清單' })).json()).toEqual({ error: 'sha conflict' });
  });

  it('待辦：拿掉那一行、帶 sha 寫回；找不到回 404', async () => {
    const notes = '## ✅ 待辦\n\n- [ ] 訂機票\n- [ ] 換歐元\n';
    let put: { content: string; sha: string; message: string } | null = null;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') { put = JSON.parse(init.body as string); return json({}); }
      return json({ content: b64(notes), sha: 'abc' });
    }));
    expect((await post({ kind: 'todo', text: '換歐元' })).status).toBe(200);
    expect(put!.sha).toBe('abc');
    expect(put!.message).toBe('chore(todo): 從儀表板刪除待辦「換歐元」');
    expect(unb64(put!.content)).toBe('## ✅ 待辦\n\n- [ ] 訂機票\n');
    expect((await post({ kind: 'todo', text: '不存在' })).status).toBe(404);
  });
});
