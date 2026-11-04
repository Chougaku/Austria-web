import { describe, it, expect, vi, afterEach } from 'vitest';
import app from '../src/index';
import { applyGuideEdit, editedGuideId, parseGuideEdit, splitGuide, type GuideEdit } from '../src/guide-edit';
import { renameTodo } from '../src/todo';
import { applyEntityEdit, parseEntityEdit } from '../src/entity-edit';
import { entityMarkdown, parseNewEntity, type NewEntity } from '../src/entity';
import { todoKey } from '../src/text';

const guide = [
  '---', 'author: "小明"', 'source: "https://example.com/a"', 'created: 2026-10-30', '---', '',
  '## 必吃', '- Café Central，見 [[維也納咖啡館]]', '![[我的地圖.png]]', '',
  '![[20261030-aaaaaaaa.jpg]]', '![[20261030-bbbbbbbb.jpg]]', '',
].join('\n');

describe('攻略編輯', () => {
  it('splitGuide：上傳的圖拆出來，其他圖、wikilink 留在內文', () => {
    expect(splitGuide(guide)).toEqual({
      author: '小明', url: 'https://example.com/a',
      body: '## 必吃\n- Café Central，見 [[維也納咖啡館]]\n![[我的地圖.png]]',
      images: ['20261030-aaaaaaaa.jpg', '20261030-bbbbbbbb.jpg'],
    });
  });

  it('改內文、拿掉作者、換網址、拿掉一張圖加一張：上傳的圖都接在最後', () => {
    const r = applyGuideEdit(guide, {
      changes: { body: '## 必吃\n- Demel', author: '', url: 'https://example.com/b' },
      removeImages: ['20261030-aaaaaaaa.jpg'], addImages: ['20261104-cccccccc.jpg'],
    });
    expect(r).toEqual({ md: '---\nsource: "https://example.com/b"\ncreated: 2026-10-30\n---\n\n## 必吃\n- Demel\n\n![[20261030-bbbbbbbb.jpg]]\n![[20261104-cccccccc.jpg]]\n' });
  });

  it('沒動內文就保留原本的內文（含 wikilink 與別的圖）；圖片超過上限擋下', () => {
    const r = applyGuideEdit(guide, { changes: {}, removeImages: [], addImages: [] }) as { md: string };
    expect(r.md).toContain('- Café Central，見 [[維也納咖啡館]]\n![[我的地圖.png]]\n\n![[20261030-aaaaaaaa.jpg]]');
    const many = Array.from({ length: 10 }, (_, i) => `20261104-0000000${i}.jpg`);
    expect(applyGuideEdit(guide, { changes: {}, removeImages: [], addImages: many })).toEqual({ error: '圖片最多 10 張' });
  });

  it('parseGuideEdit：標題改了就換 id；網址、內文、圖片檔名都要合格', () => {
    const e = parseGuideEdit({ id: '咖啡館清單', changes: { title: '咖啡館: 私房' } }) as GuideEdit;
    expect(editedGuideId(e)).toBe('咖啡館 私房');
    expect(parseGuideEdit({ id: '../x', changes: {} })).toBe('標題不對');
    expect(parseGuideEdit({ id: 'x', changes: { url: 'javascript:alert(1)' } })).toContain('http');
    expect(parseGuideEdit({ id: 'x', changes: { body: '  ' } })).toBe('請填內容');
    expect(parseGuideEdit({ id: 'x', changes: {}, removeImages: ['我的地圖.png'] })).toBe('圖片檔名不對');
  });
});

describe('待辦改字', () => {
  const notes = '## ✅ 待辦\n\n- [ ] 訂機票\n- [x] 辦護照\n- [ ] 預約[[美泉宮]]\n\n## 筆記\n';
  it('勾選框照舊、只改那一行；同名擋下、找不到回 missing', () => {
    expect(renameTodo(notes, '辦護照', '辦護照（已拿到）')).toBe(notes.replace('- [x] 辦護照', '- [x] 辦護照（已拿到）'));
    expect(renameTodo(notes, '預約美泉宮', '預約美泉宮 $1 時段')).toBe(notes.replace('- [ ] 預約[[美泉宮]]', '- [ ] 預約美泉宮 $1 時段'));
    expect(renameTodo(notes, '訂機票', '辦護照')).toBe('exists');
    expect(renameTodo(notes, '不存在', 'x')).toBe('missing');
  });
});

describe('評分', () => {
  const blank: Omit<NewEntity, 'category' | 'name'> = { type: '', city: '', location: '', address: '', ticket: '', price: '', summary: '', rating: '', images: [] };
  it('新增：評分寫在類型後面；不合格擋下', () => {
    const e = parseNewEntity({ category: '餐廳', name: 'Figlmüller', type: '維也納菜', rating: 4 }) as NewEntity;
    expect(entityMarkdown({ ...e }, '2026-11-04')).toContain('- 類型：維也納菜\n- 評分：4\n');
    expect(parseNewEntity({ category: '餐廳', name: 'x', rating: 6 })).toBe('評分要是 0 到 5');
    expect(parseNewEntity({ category: '餐廳', name: 'x', rating: '很好' })).toBe('評分要是 0 到 5');
    expect(entityMarkdown({ ...blank, category: '餐廳', name: 'x' }, '2026-11-04')).not.toContain('評分');
  });

  it('編輯：手寫的「評分：N/A」換成星等；清掉就刪那行', () => {
    const md = '---\ntitle: 美泉宮\n---\n\n夏宮。\n\n## 基本資訊\n- 類型：宮殿\n- 評分：N/A\n- 地址：x\n';
    expect(applyEntityEdit(md, { changes: { rating: '5' }, removeImages: [], addImages: [] }, '2026-11-04')).toContain('- 評分：5\n- 地址：x');
    expect(applyEntityEdit(md, { changes: { rating: '' }, removeImages: [], addImages: [] }, '2026-11-04')).not.toContain('評分');
    expect(parseEntityEdit({ id: '景點/美泉宮', changes: { rating: 9 } })).toBe('評分要是 0 到 5');
  });
});

describe('路由', () => {
  afterEach(() => vi.unstubAllGlobals());
  const b64 = (s: string) => { let bin = ''; for (const x of new TextEncoder().encode(s)) bin += String.fromCharCode(x); return btoa(bin); };
  const unb64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0)));
  const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });
  const state = new Map<string, string>();
  const db = {
    prepare: (sql: string) => ({
      bind: (...args: string[]) => ({
        first: async () => (state.has(args[0]) ? { value: state.get(args[0]) } : null),
        run: async () => { if (sql.startsWith('INSERT')) state.set(args[0], args[1]); return { success: true }; },
      }),
    }),
  };
  const env = { DB: db as unknown, DASH_TOKEN: 's', DASH_PASSWORD: 'x', GH_OWNER: 'o', GH_REPO: 'r', GH_BRANCH: 'main', GH_ITINERARY_PATH: 'p', GITHUB_TOKEN: 't' };
  const auth = { Authorization: 'Bearer s', 'Content-Type': 'application/json' };

  it('GET /api/guide 不用登入，回原始內容拆好的樣子', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ content: b64(guide) })));
    const res = await app.request(`/api/guide?id=${encodeURIComponent('咖啡館清單')}`, {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: '咖啡館清單', author: '小明', images: ['20261030-aaaaaaaa.jpg', '20261030-bbbbbbbb.jpg'] });
    expect((await app.request('/api/guide?id=..%2Fx', {}, env)).status).toBe(400);
  });

  it('POST /api/guide/update：改標題＝換檔名、刪掉的圖一起刪，典藏跟著搬', async () => {
    state.set('guide:咖啡館清單', '1');
    const calls: { url: string; method: string; body?: { tree?: { path: string; content?: string }[] } }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: init?.body ? JSON.parse(init.body as string) : undefined });
      if (url.endsWith('/git/ref/heads/main')) return json({ object: { sha: 'h' } });
      if (url.endsWith('/git/commits/h')) return json({ tree: { sha: 't' } });
      if (url.includes(encodeURI('咖啡館清單.md'))) return json({ content: b64(guide) });
      if (url.includes('/contents/')) return url.includes('/contents/assets') ? json([{ path: 'assets/20261030-aaaaaaaa.jpg' }]) : json({}, 404);
      if (method === 'PATCH') return json({});
      return json({ sha: 'n' }, 201);
    }));
    const res = await app.request('/api/guide/update', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ id: '咖啡館清單', changes: { title: '維也納咖啡館' }, removeImages: ['20261030-aaaaaaaa.jpg'] }),
    }, env);
    expect(await res.json()).toEqual({ ok: true, id: '維也納咖啡館' });
    const tree = calls.find((x) => x.url.endsWith('/git/trees'))!.body!.tree!;
    expect(tree.map((t) => t.path)).toEqual(['原始資料/別人行程/維也納咖啡館.md', '原始資料/別人行程/咖啡館清單.md', 'assets/20261030-aaaaaaaa.jpg']);
    expect(tree[0].content).not.toContain('aaaaaaaa');
    expect(state.get('guide:維也納咖啡館')).toBe('1');
  });

  it('POST /api/todo/update：改字、帶 sha，勾選記錄搬到新的 key；同名 409', async () => {
    const notes = '## ✅ 待辦\n\n- [x] 辦護照\n- [ ] 訂機票\n';
    state.set(todoKey('辦護照'), '1');
    let put: { content: string; sha: string } | null = null;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') { put = JSON.parse(init.body as string); return json({}); }
      return json({ content: b64(notes), sha: 'abc' });
    }));
    const post = (body: unknown) => app.request('/api/todo/update', { method: 'POST', headers: auth, body: JSON.stringify(body) }, env);
    expect((await post({ text: '辦護照', next: '辦護照與駕照' })).status).toBe(200);
    expect(unb64(put!.content)).toBe('## ✅ 待辦\n\n- [x] 辦護照與駕照\n- [ ] 訂機票\n');
    expect(put!.sha).toBe('abc');
    expect(state.get(todoKey('辦護照與駕照'))).toBe('1');
    expect(state.get(todoKey('辦護照'))).toBe('0');
    expect((await post({ text: '訂機票', next: '辦護照' })).status).toBe(409);
    expect((await post({ text: '不存在', next: 'x' })).status).toBe(404);
  });
});
