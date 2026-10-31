import { describe, it, expect, vi, afterEach } from 'vitest';
import app from '../src/index';
import { applyEntityEdit, editedId, parseEntityEdit, type EntityEdit } from '../src/entity-edit';

const TODAY = '2026-10-31';
const edit = (changes: EntityEdit['changes'], extra: Partial<EntityEdit> = {}) =>
  ({ changes, removeImages: [], addImages: [], ...extra });

// 儀表板建的格式
const created = [
  '---', 'title: "Öfferl - Praterstrasse 26（更）"', 'tags: ["餐廳","維也納"]', 'updated: 2026-10-29', '---', '',
  '價格較高，較多人推甜點及糕點', '',
  '## 基本資訊', '- 類型：咖啡廳', '- 價位：10-20歐', '- 位置：維也納 / 普拉特', '',
  '## 照片', '![[20261029-d06d6ecd.jpg]]', '![[20261029-1bf3fb1c.jpg]]', '',
  '## 來源', '- 從儀表板新增', '',
].join('\n');

// Obsidian 手寫的格式（多了評分、營業時間、交通段落）
const handwritten = [
  '---', 'title: 美泉宮 Schloss Schönbrunn', 'tags: [景點, 宮殿]', 'updated: 2026-10-02', '---', '',
  '哈布斯堡王朝的夏宮。', '',
  '## 基本資訊', '- 類型：宮殿／世界遺產', '- 評分：N/A', '- 地址：Schönbrunner Schloßstraße 47', '- 門票：（待查）', '',
  '## 交通', '- 地鐵 U4「Schönbrunn」站步行約 5 分', '',
  '## 來源', '- （填資料來源）', '',
].join('\n');

describe('applyEntityEdit：只改動過的', () => {
  it('改名、簡介、價位，其他照舊；updated 換成今天', () => {
    const out = applyEntityEdit(created, edit({ name: 'Öfferl - Praterstrasse 26', summary: '奶油蛋捲配火腿很特別', price: '15-25歐' }), TODAY);
    expect(out).toBe(created
      .replace('title: "Öfferl - Praterstrasse 26（更）"', 'title: "Öfferl - Praterstrasse 26"')
      .replace('updated: 2026-10-29', `updated: ${TODAY}`)
      .replace('價格較高，較多人推甜點及糕點', '奶油蛋捲配火腿很特別')
      .replace('- 價位：10-20歐', '- 價位：15-25歐'));
  });

  it('手寫的檔：評分、交通段落都留著；清掉的欄位整行拿掉、新欄位接在清單最後', () => {
    const out = applyEntityEdit(handwritten, edit({ ticket: '', location: '維也納 / 美泉宮', type: '宮殿' }), TODAY);
    expect(out).toContain('- 類型：宮殿\n- 評分：N/A\n- 地址：Schönbrunner Schloßstraße 47\n- 位置：維也納 / 美泉宮\n\n## 交通');
    expect(out).not.toContain('門票');
    expect(out).toContain('## 交通\n- 地鐵 U4「Schönbrunn」站步行約 5 分');
    expect(out).toContain('title: 美泉宮 Schloss Schönbrunn'); // 沒改名不動
  });

  it('照片：拿掉一張、加兩張；全部拿掉就連標題一起拿掉', () => {
    const out = applyEntityEdit(created, edit({}, {
      removeImages: ['20261029-d06d6ecd.jpg'], addImages: ['20261031-aaaaaaaa.jpg', '20261031-bbbbbbbb.jpg'],
    }), TODAY);
    expect(out).toContain('## 照片\n![[20261029-1bf3fb1c.jpg]]\n![[20261031-aaaaaaaa.jpg]]\n![[20261031-bbbbbbbb.jpg]]\n\n## 來源');
    const none = applyEntityEdit(created, edit({}, { removeImages: ['20261029-d06d6ecd.jpg', '20261029-1bf3fb1c.jpg'] }), TODAY);
    expect(none).not.toContain('## 照片');
    expect(none).toContain('- 位置：維也納 / 普拉特\n\n## 來源');
  });

  it('原本沒有照片段落、沒有簡介、沒有基本資訊也接得上；外部網址的圖也拿得掉', () => {
    const bare = '---\ntitle: x\n---\n\n![說明](https://example.com/a.jpg)\n\n## 來源\n- 手寫\n';
    const out = applyEntityEdit(bare, edit({ summary: '新簡介', type: '咖啡廳' }, {
      removeImages: ['https://example.com/a.jpg'], addImages: ['20261031-aaaaaaaa.jpg'],
    }), TODAY);
    expect(out).toBe(`---\ntitle: x\nupdated: ${TODAY}\n---\n\n新簡介\n\n## 基本資訊\n- 類型：咖啡廳\n\n## 照片\n![[20261031-aaaaaaaa.jpg]]\n\n## 來源\n- 手寫\n`);
  });

  it('簡介清空就拿掉那段；CRLF 的檔也讀得懂', () => {
    const out = applyEntityEdit(created.replace(/\n/g, '\r\n'), edit({ summary: '' }), TODAY);
    expect(out).not.toContain('\r');
    expect(out).toContain('---\n\n## 基本資訊');
  });
});

describe('parseEntityEdit', () => {
  it('只收動過的欄位；名稱、圖片、id 都要合格', () => {
    const e = parseEntityEdit({ id: '餐廳/Öfferl', changes: { price: ' 20歐 ', bogus: 'x' } }) as EntityEdit;
    expect(e.changes).toEqual({ price: '20歐' });
    expect(editedId(e)).toBe('餐廳/Öfferl');
    expect(editedId(parseEntityEdit({ id: '餐廳/Öfferl', changes: { name: 'Öfferl: 本店' } }) as EntityEdit)).toBe('餐廳/Öfferl 本店');
    expect(parseEntityEdit({ id: '交通/租車', changes: {} })).toBe('只能編輯餐廳、景點或購物');
    expect(parseEntityEdit({ id: '餐廳/../x', changes: {} })).toBe('名稱不對');
    expect(parseEntityEdit({ id: '餐廳/x', changes: { name: '///' } })).toBe('名稱不能是空的或只有符號');
    expect(parseEntityEdit({ id: '餐廳/x', changes: {}, addImages: ['../a.md'] })).toBe('圖片檔名不對');
    expect(parseEntityEdit({ id: '餐廳/x', changes: {}, removeImages: ['a]] ![[b'] })).toBe('要刪的圖片不對');
  });
});

describe('POST /api/entity/update', () => {
  afterEach(() => vi.unstubAllGlobals());
  const b64 = (s: string) => { let bin = ''; for (const x of new TextEncoder().encode(s)) bin += String.fromCharCode(x); return btoa(bin); };
  const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });
  const state = new Map<string, string>([['fav:餐廳/Öfferl - Praterstrasse 26（更）', '1']]);
  const db = {
    prepare: (sql: string) => ({
      bind: (...args: string[]) => ({
        first: async () => (state.has(args[0]) ? { value: state.get(args[0]) } : null),
        run: async () => { if (sql.startsWith('INSERT')) state.set(args[0], args[1]); return { success: true }; },
      }),
    }),
  };
  const env = { DB: db as unknown, DASH_TOKEN: 's', DASH_PASSWORD: 'x', GH_OWNER: 'o', GH_REPO: 'r', GH_BRANCH: 'main', GH_ITINERARY_PATH: 'p', GITHUB_TOKEN: 't' };
  const post = (body: unknown) => app.request('/api/entity/update', {
    method: 'POST', headers: { Authorization: 'Bearer s', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }, env);

  const github = (opts: { newExists?: boolean; patch?: number } = {}) => {
    const calls: { url: string; method: string; body?: Record<string, unknown> }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: init?.body ? JSON.parse(init.body as string) : undefined });
      if (url.endsWith('/git/ref/heads/main')) return json({ object: { sha: 'head1' } });
      if (url.endsWith('/git/commits/head1')) return json({ tree: { sha: 'tree1' } });
      if (url.includes(encodeURI('（更）.md'))) return json({ content: b64(created) });
      if (url.includes('/contents/wiki/')) return opts.newExists ? json({ content: '' }) : json({ message: 'Not Found' }, 404);
      if (url.includes('/contents/assets')) return json([{ path: 'assets/20261029-d06d6ecd.jpg' }]);
      if (url.endsWith('/git/trees')) return json({ sha: 'tree2' }, 201);
      if (url.endsWith('/git/commits')) return json({ sha: 'c2' }, 201);
      if (method === 'PATCH') return json({}, opts.patch ?? 200);
      return json({}, 500);
    }));
    return calls;
  };
  const id = '餐廳/Öfferl - Praterstrasse 26（更）';

  it('改名＋拿掉一張照片：新檔、刪舊檔、刪照片同一筆 commit，讀的是 head 那一版，收藏搬到新 id', async () => {
    const calls = github();
    const res = await post({ id, changes: { name: 'Öfferl - Praterstrasse 26' }, removeImages: ['20261029-d06d6ecd.jpg'] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, id: '餐廳/Öfferl - Praterstrasse 26' });
    expect(calls.find((x) => x.url.includes(encodeURI('（更）.md')))!.url).toContain('?ref=head1');
    const tree = calls.find((x) => x.url.endsWith('/git/trees'))!.body as { tree: { path: string; content?: string; sha?: null }[] };
    expect(tree.tree.map((t) => [t.path, 'content' in t ? 'write' : 'delete'])).toEqual([
      ['wiki/entities/餐廳/Öfferl - Praterstrasse 26.md', 'write'],
      ['wiki/entities/餐廳/Öfferl - Praterstrasse 26（更）.md', 'delete'],
      ['assets/20261029-d06d6ecd.jpg', 'delete'],
    ]);
    expect(tree.tree[0].content).toContain('title: "Öfferl - Praterstrasse 26"');
    expect(tree.tree[0].content).not.toContain('d06d6ecd');
    expect((calls.find((x) => x.url.endsWith('/git/commits') && x.method === 'POST')!.body as { message: string }).message)
      .toBe('chore(entity): 從儀表板編輯餐廳「Öfferl - Praterstrasse 26」');
    expect(state.get('fav:餐廳/Öfferl - Praterstrasse 26')).toBe('1');
    expect(state.get(`fav:${id}`)).toBe('0');
  });

  it('改成已經存在的名字 → 409；檔案不見了 → 404；中途被推新東西 → 409', async () => {
    github({ newExists: true });
    expect(await (await post({ id, changes: { name: 'Öfferl - Praterstrasse 26' } })).json()).toMatchObject({ error: 'exists' });
    github();
    expect((await post({ id: '餐廳/不存在', changes: { price: '1' } })).status).toBe(404);
    github({ patch: 422 });
    expect(await (await post({ id, changes: { price: '1' } })).json()).toEqual({ error: 'sha conflict' });
  });
});
