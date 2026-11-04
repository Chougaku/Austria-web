import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { entityMarkdown, parseNewEntity } from './entity';
import { GUIDE_DIR, guideMarkdown, parseNewGuide } from './guide';
import { IMAGE_DIR, MAX_IMAGE_BYTES, imageFileName, sniffImage } from './image';
import { IMAGE_FILE, bytesToBase64, fileName, taipeiDate, todoKey } from './text';
import { TODO_PATH, insertTodo, parseTodoText, renameTodo } from './todo';
import { parseDelete, removeTodo, uploadedImages } from './remove';
import { applyEntityEdit, editedId, parseEntityEdit } from './entity-edit';
import { applyGuideEdit, editedGuideId, guidePath, parseGuideEdit, splitGuide } from './guide-edit';

type Bindings = {
  DB: D1Database; DASH_TOKEN: string; DASH_PASSWORD: string;
  GH_OWNER: string; GH_REPO: string; GH_BRANCH: string; GH_ITINERARY_PATH: string; GITHUB_TOKEN: string;
  /** 前端網址白名單，逗號分隔（wrangler.toml 的 [vars]）。 */
  ALLOWED_ORIGINS?: string;
};
const app = new Hono<{ Bindings: Bindings }>();

const DEFAULT_ORIGINS = ['https://austria.pages.dev', 'https://chougaku.github.io'];

export const originList = (raw?: string) =>
  raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : DEFAULT_ORIGINS;

/** 正式網域走白名單（wrangler.toml 的 ALLOWED_ORIGINS）；本機開發任意 port（vite 撞港時會自己換號）都放行。 */
export function allowOrigin(origin: string, allowed: string[] = DEFAULT_ORIGINS): string | null {
  if (allowed.includes(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

app.use('/api/*', cors({
  origin: (origin, c) => allowOrigin(origin, originList(c.env.ALLOWED_ORIGINS)) ?? undefined,
  allowMethods: ['GET', 'PUT', 'POST', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type'],
}));

app.use('/api/*', async (c, next) => {
  // 公開：讀取(GET)、預檢(OPTIONS)、登入(POST /api/login)；其餘寫入需 DASH_TOKEN。
  // secret 沒設時一律擋——否則送 `Bearer undefined` 就能寫入。
  const open = c.req.method === 'GET' || c.req.method === 'OPTIONS' || c.req.path === '/api/login';
  const token = c.env.DASH_TOKEN;
  if (!open && (!token || c.req.header('Authorization') !== `Bearer ${token}`)) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
});

// 以共用密碼換取寫入用的 token。
app.post('/api/login', async (c) => {
  const { DASH_PASSWORD, DASH_TOKEN } = c.env;
  if (!DASH_PASSWORD || !DASH_TOKEN) return c.json({ error: 'login not configured' }, 503);
  const body = await c.req.json<{ password?: unknown }>().catch(() => null);
  if (typeof body?.password !== 'string' || body.password !== DASH_PASSWORD) {
    return c.json({ error: 'invalid password' }, 401);
  }
  return c.json({ token: DASH_TOKEN });
});

app.get('/api/state', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT key, value FROM state').all<{ key: string; value: string }>();
  const map: Record<string, boolean> = {};
  for (const r of results) map[r.key] = r.value === '1';
  return c.json(map);
});

app.put('/api/state/:key', async (c) => {
  const key = decodeURIComponent(c.req.param('key'));
  const { value } = await c.req.json<{ value: boolean }>();
  await c.env.DB
    .prepare('INSERT INTO state (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3')
    .bind(key, value ? '1' : '0', new Date().toISOString())
    .run();
  return c.json({ ok: true });
});

const toBase64 = (str: string) => bytesToBase64(new TextEncoder().encode(str));
function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
/** 保留現檔第一個 `## Day` 之前的前言，其後換成新行程區塊。 */
function spliceItinerary(current: string, daySections: string): string {
  const idx = current.search(/^## Day /m);
  const preamble = idx >= 0 ? current.slice(0, idx) : current.replace(/\n*$/, '\n\n');
  return preamble + daySections;
}

/** GitHub 失敗時把原因帶回前端——401/403 幾乎都是 GITHUB_TOKEN 過期或權限不足，
    這種只有換 secret 才會好，訊息要說得夠明白，別讓人以為是自己網路有問題。 */
export function ghError(error: string, status: number, detail: string) {
  const reason = status === 401 || status === 403 ? 'github-auth' : status === 404 ? 'github-missing' : 'github';
  return { error, reason, status, detail: detail.slice(0, 300) };
}

/** vault 裡某個檔案的 GitHub contents API 位址與標頭。 */
function ghContents(env: Bindings, path: string) {
  return {
    api: `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${encodeURI(path)}`,
    ghHeaders: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'User-Agent': 'austria-dashboard-worker',
      Accept: 'application/vnd.github+json',
    },
  };
}

app.put('/api/itinerary', async (c) => {
  const { daySectionsMarkdown } = await c.req.json<{ daySectionsMarkdown: string }>();
  if (typeof daySectionsMarkdown !== 'string' || !daySectionsMarkdown.includes('## Day ')) {
    return c.json({ error: 'invalid itinerary' }, 400);
  }
  const { GH_BRANCH, GH_ITINERARY_PATH } = c.env;
  const { api, ghHeaders } = ghContents(c.env, GH_ITINERARY_PATH);

  const getRes = await fetch(`${api}?ref=${GH_BRANCH}`, { headers: ghHeaders });
  if (!getRes.ok) {
    const detail = await getRes.text();
    console.log('[itinerary] GET', getRes.status, detail);
    return c.json(ghError('github get failed', getRes.status, detail), 502);
  }
  const file = await getRes.json<{ content: string; sha: string }>();
  const next = spliceItinerary(fromBase64(file.content), daySectionsMarkdown);

  const putRes = await fetch(api, {
    method: 'PUT',
    headers: { ...ghHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'chore(itinerary): 從儀表板更新每日行程',
      content: toBase64(next),
      sha: file.sha,
      branch: GH_BRANCH,
    }),
  });
  if (putRes.status === 409) return c.json({ error: 'sha conflict' }, 409);
  if (!putRes.ok) {
    const detail = await putRes.text();
    console.log('[itinerary] PUT', putRes.status, detail);
    return c.json(ghError('github put failed', putRes.status, detail), 502);
  }
  return c.json({ ok: true });
});

/** 在 vault 建一個新檔。同名檔已經存在就不動它（回 409），免得蓋掉別人在 Obsidian 寫好的內容。 */
async function createVaultFile(c: Context<{ Bindings: Bindings }>, path: string, base64: string, message: string, id: string) {
  const { api, ghHeaders } = ghContents(c.env, path);
  const getRes = await fetch(`${api}?ref=${c.env.GH_BRANCH}`, { headers: ghHeaders });
  if (getRes.ok) return c.json({ error: 'exists', id }, 409);
  if (getRes.status !== 404) {
    const detail = await getRes.text();
    console.log('[create] GET', getRes.status, detail);
    return c.json(ghError('github get failed', getRes.status, detail), 502);
  }
  const putRes = await fetch(api, {
    method: 'PUT',
    headers: { ...ghHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: base64, branch: c.env.GH_BRANCH }),
  });
  // 422＝檢查完到寫入之間有人先建了同名檔
  if (putRes.status === 422) return c.json({ error: 'exists', id }, 409);
  if (!putRes.ok) {
    const detail = await putRes.text();
    console.log('[create] PUT', putRes.status, detail);
    return c.json(ghError('github put failed', putRes.status, detail), 502);
  }
  return c.json({ ok: true, id }, 201);
}

// 新增餐廳／景點／購物：wiki/entities/<分類>/<名稱>.md。推上去後 vault 會通知網站重建。
app.post('/api/entity', async (c) => {
  const e = parseNewEntity(await c.req.json().catch(() => null));
  if (typeof e === 'string') return c.json({ error: 'invalid entity', detail: e }, 400);
  const id = `${e.category}/${fileName(e.name)}`;
  return createVaultFile(c, `wiki/entities/${id}.md`, toBase64(entityMarkdown(e, taipeiDate())),
    `feat(entity): 從儀表板新增${e.category}「${e.name}」`, id);
});

// 新增攻略：原始資料/別人行程/<標題>.md（標題就是檔名）。
app.post('/api/guide', async (c) => {
  const g = parseNewGuide(await c.req.json().catch(() => null));
  if (typeof g === 'string') return c.json({ error: 'invalid guide', detail: g }, 400);
  const id = fileName(g.title);
  return createVaultFile(c, `${GUIDE_DIR}/${id}.md`, toBase64(guideMarkdown(g, taipeiDate())),
    `feat(guide): 從儀表板新增攻略「${g.title}」`, id);
});

// 上傳圖片：存到 vault 的 assets/<日期-亂數>.jpg，回傳檔名讓新增／行程用 ![[檔名]] 嵌入。
// commit 訊息帶 [skip ci] 不觸發網站重建：圖片一定跟著一筆新增或行程存檔一起送，那筆 commit 才重建，免得一張圖重建一次。
app.post('/api/image', async (c) => {
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (bytes.length === 0) return c.json({ error: 'invalid image', detail: '沒有收到圖片' }, 400);
  if (bytes.length > MAX_IMAGE_BYTES) return c.json({ error: 'invalid image', detail: '圖片太大（最多 6 MB）' }, 400);
  const ext = sniffImage(bytes);
  if (!ext) return c.json({ error: 'invalid image', detail: '只收 JPG、PNG、WebP 圖片' }, 400);
  const file = imageFileName(ext, taipeiDate(), crypto.randomUUID());
  return createVaultFile(c, `${IMAGE_DIR}/${file}`, bytesToBase64(bytes),
    `chore(image): 從儀表板上傳圖片 ${file} [skip ci]`, file);
});

// 新增出發前待辦：行程筆記 `## ✅ 待辦` 段落最後補一行。同一句已經在清單裡回 409。
app.post('/api/todo', async (c) => {
  const text = parseTodoText(await c.req.json().catch(() => null));
  if (typeof text !== 'string') return c.json({ error: 'invalid todo', detail: text.error }, 400);
  const { api, ghHeaders } = ghContents(c.env, TODO_PATH);
  const getRes = await fetch(`${api}?ref=${c.env.GH_BRANCH}`, { headers: ghHeaders });
  if (!getRes.ok) {
    const detail = await getRes.text();
    console.log('[todo] GET', getRes.status, detail);
    return c.json(ghError('github get failed', getRes.status, detail), 502);
  }
  const file = await getRes.json<{ content: string; sha: string }>();
  const next = insertTodo(fromBase64(file.content), text);
  if (next === null) return c.json({ error: 'exists' }, 409);
  const putRes = await fetch(api, {
    method: 'PUT',
    headers: { ...ghHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `feat(todo): 從儀表板新增待辦「${text}」`, content: toBase64(next), sha: file.sha, branch: c.env.GH_BRANCH }),
  });
  if (putRes.status === 409) return c.json({ error: 'sha conflict' }, 409);
  if (!putRes.ok) {
    const detail = await putRes.text();
    console.log('[todo] PUT', putRes.status, detail);
    return c.json(ghError('github put failed', putRes.status, detail), 502);
  }
  return c.json({ ok: true }, 201);
});

/** Git Data API：一筆 commit 改好幾個檔（新增／改內容／刪掉），網站只重建一次、歷史也只有一筆。
    先拿到分支目前的 head，讀檔也讀這個版本；最後更新分支只接受 fast-forward，
    中間有人推了新東西（GitHub 回 422）就回 'conflict'，前端請使用者再按一次。 */
type GitBase = { git: string; headers: Record<string, string>; head: string; baseTree: string };
type TreeEntry = { path: string; content: string } | { path: string; remove: true };

async function gitHead(env: Bindings): Promise<GitBase | Response> {
  const git = `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/git`;
  const headers = { ...ghContents(env, '').ghHeaders, 'Content-Type': 'application/json' };
  const ref = await fetch(`${git}/ref/heads/${env.GH_BRANCH}`, { headers });
  if (!ref.ok) return ref;
  const head = (await ref.json<{ object: { sha: string } }>()).object.sha;
  const commit = await fetch(`${git}/commits/${head}`, { headers });
  if (!commit.ok) return commit;
  return { git, headers, head, baseTree: (await commit.json<{ tree: { sha: string } }>()).tree.sha };
}

async function commitTree(env: Bindings, base: GitBase, entries: TreeEntry[], message: string): Promise<true | 'conflict' | Response> {
  const { git, headers, head, baseTree } = base;
  const tree = await fetch(`${git}/trees`, {
    method: 'POST', headers,
    // content＝新內容；sha: null＝把這個路徑從樹上拿掉
    body: JSON.stringify({
      base_tree: baseTree,
      tree: entries.map((e) => ('remove' in e
        ? { path: e.path, mode: '100644', type: 'blob', sha: null }
        : { path: e.path, mode: '100644', type: 'blob', content: e.content })),
    }),
  });
  if (!tree.ok) return tree;
  const created = await fetch(`${git}/commits`, {
    method: 'POST', headers,
    body: JSON.stringify({ message, tree: (await tree.json<{ sha: string }>()).sha, parents: [head] }),
  });
  if (!created.ok) return created;
  const update = await fetch(`${git}/refs/heads/${env.GH_BRANCH}`, {
    method: 'PATCH', headers, body: JSON.stringify({ sha: (await created.json<{ sha: string }>()).sha }),
  });
  if (update.status === 422) return 'conflict';
  return update.ok ? true : update;
}

/** assets/ 裡真的還在的檔（樹上不存在的路徑 GitHub 會拒絕整筆）。 */
async function existingAssets(env: Bindings, paths: string[], ref: string): Promise<string[]> {
  if (paths.length === 0) return [];
  const dir = ghContents(env, IMAGE_DIR);
  const list = await fetch(`${dir.api}?ref=${ref}`, { headers: dir.ghHeaders });
  const have = new Set(list.ok ? (await list.json<{ path: string }[]>()).map((f) => f.path) : []);
  return paths.filter((p) => have.has(p));
}

// 刪除：餐廳／景點／購物、攻略連同它從儀表板上傳的照片一起刪（一筆 commit，觸發網站重建），或拿掉一句待辦。
// 找不到要刪的東西回 404（可能別台裝置已經刪了）。vault 是 git，刪錯可以從歷史救回。
app.post('/api/delete', async (c) => {
  const req = parseDelete(await c.req.json().catch(() => null));
  if (typeof req === 'string') return c.json({ error: 'invalid delete', detail: req }, 400);
  const fail = async (tag: string, res: Response) => {
    const detail = await res.text();
    console.log(`[delete] ${tag}`, res.status, detail);
    return c.json(ghError(`github ${tag} failed`, res.status, detail), 502);
  };
  const branch = c.env.GH_BRANCH;

  if (req.kind === 'todo') {
    const { api, ghHeaders } = ghContents(c.env, TODO_PATH);
    const getRes = await fetch(`${api}?ref=${branch}`, { headers: ghHeaders });
    if (!getRes.ok) return fail('get', getRes);
    const file = await getRes.json<{ content: string; sha: string }>();
    const next = removeTodo(fromBase64(file.content), req.text);
    if (next === null) return c.json({ error: 'missing' }, 404);
    const putRes = await fetch(api, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `chore(todo): 從儀表板刪除待辦「${req.text}」`, content: toBase64(next), sha: file.sha, branch }),
    });
    if (putRes.status === 409) return c.json({ error: 'sha conflict' }, 409);
    if (!putRes.ok) return fail('put', putRes);
    return c.json({ ok: true });
  }

  const base = await gitHead(c.env);
  if (base instanceof Response) return fail('git', base);
  const { api, ghHeaders } = ghContents(c.env, req.path);
  const getRes = await fetch(`${api}?ref=${base.head}`, { headers: ghHeaders });
  if (getRes.status === 404) return c.json({ error: 'missing' }, 404);
  if (!getRes.ok) return fail('get', getRes);
  const images = await existingAssets(c.env, uploadedImages(fromBase64((await getRes.json<{ content: string }>()).content)), base.head);
  const what = req.kind === 'entity' ? `${req.category}「${req.id.slice(req.category.length + 1)}」` : `攻略「${req.id}」`;
  const removed = [req.path, ...images];
  const r = await commitTree(c.env, base, removed.map((path) => ({ path, remove: true as const })), `chore(${req.kind}): 從儀表板刪除${what}`);
  if (r === 'conflict') return c.json({ error: 'sha conflict' }, 409);
  if (r !== true) return fail('git', r);
  return c.json({ ok: true, removed });
});

// 編輯餐廳／景點／購物：讀目前的檔，只改動過的欄位（其他段落照舊），改名就連檔名一起換、收藏跟著搬，
// 拿掉的照片若是儀表板上傳的就從 assets/ 刪掉。全部一筆 commit，觸發網站重建。
app.post('/api/entity/update', async (c) => {
  const edit = parseEntityEdit(await c.req.json().catch(() => null));
  if (typeof edit === 'string') return c.json({ error: 'invalid edit', detail: edit }, 400);
  const fail = async (tag: string, res: Response) => {
    const detail = await res.text();
    console.log(`[edit] ${tag}`, res.status, detail);
    return c.json(ghError(`github ${tag} failed`, res.status, detail), 502);
  };
  const base = await gitHead(c.env);
  if (base instanceof Response) return fail('git', base);

  const oldPath = `wiki/entities/${edit.id}.md`;
  const { api, ghHeaders } = ghContents(c.env, oldPath);
  const getRes = await fetch(`${api}?ref=${base.head}`, { headers: ghHeaders });
  if (getRes.status === 404) return c.json({ error: 'missing' }, 404);
  if (!getRes.ok) return fail('get', getRes);
  const md = fromBase64((await getRes.json<{ content: string }>()).content);

  const newId = editedId(edit);
  const renamed = newId !== edit.id;
  const newPath = `wiki/entities/${newId}.md`;
  if (renamed) {
    const exists = await fetch(`${ghContents(c.env, newPath).api}?ref=${base.head}`, { headers: ghHeaders });
    if (exists.ok) return c.json({ error: 'exists', id: newId }, 409);
    if (exists.status !== 404) return fail('get', exists);
  }
  const gone = await existingAssets(c.env,
    edit.removeImages.filter((f) => IMAGE_FILE.test(f)).map((f) => `${IMAGE_DIR}/${f}`), base.head);
  const entries: TreeEntry[] = [
    { path: newPath, content: applyEntityEdit(md, edit, taipeiDate()) },
    ...(renamed ? [{ path: oldPath, remove: true as const }] : []),
    ...gone.map((path) => ({ path, remove: true as const })),
  ];
  const name = edit.changes.name ?? edit.id.slice(edit.category.length + 1);
  const r = await commitTree(c.env, base, entries, `chore(entity): 從儀表板編輯${edit.category}「${name}」`);
  if (r === 'conflict') return c.json({ error: 'sha conflict' }, 409);
  if (r !== true) return fail('git', r);

  // 收藏記在 D1，key 跟著 id 走：改名後搬到新 id
  if (renamed) await moveState(c.env.DB, `fav:${edit.id}`, `fav:${newId}`);
  return c.json({ ok: true, id: newId });
});

/** D1 裡的勾選／收藏狀態搬到新 key（改名、改字後）。失敗只記 log——vault 已經存好了，不能因此回錯。 */
async function moveState(db: D1Database, from: string, to: string): Promise<void> {
  try {
    const row = await db.prepare('SELECT value FROM state WHERE key = ?1').bind(from).first<{ value: string }>();
    if (row?.value !== '1') return;
    const now = new Date().toISOString();
    const upsert = 'INSERT INTO state (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3';
    await db.prepare(upsert).bind(to, '1', now).run();
    await db.prepare(upsert).bind(from, '0', now).run();
  } catch (e) { console.log('[state] move failed', from, to, e); }
}

// 讀一篇攻略的原始內容（編輯表單用）：作者、原文網址、內文（不含上傳的圖）、上傳的圖。
// 網站上的攻略是建置後的版本（wikilink 拿掉了、圖換成網站網址），拿那份去改會把 vault 改壞，所以從 vault 讀。
// GET 不用登入（vault 本來就公開）。
app.get('/api/guide', async (c) => {
  const id = c.req.query('id') ?? '';
  if (!id || /[\\/]/.test(id) || id.includes('..')) return c.json({ error: 'invalid guide', detail: '標題不對' }, 400);
  const { api, ghHeaders } = ghContents(c.env, guidePath(id));
  const res = await fetch(`${api}?ref=${c.env.GH_BRANCH}`, { headers: ghHeaders });
  if (res.status === 404) return c.json({ error: 'missing' }, 404);
  if (!res.ok) {
    const detail = await res.text();
    return c.json(ghError('github get failed', res.status, detail), 502);
  }
  return c.json({ id, ...splitGuide(fromBase64((await res.json<{ content: string }>()).content)) });
});

// 編輯攻略：改標題就換檔名（同名已存在回 409），作者／網址寫 frontmatter，內文整段換，
// 上傳的圖照「原本扣掉拿掉的＋新的」接在最後，拿掉的圖從 assets/ 刪。全部一筆 commit。
app.post('/api/guide/update', async (c) => {
  const edit = parseGuideEdit(await c.req.json().catch(() => null));
  if (typeof edit === 'string') return c.json({ error: 'invalid edit', detail: edit }, 400);
  const fail = async (tag: string, res: Response) => {
    const detail = await res.text();
    console.log(`[guide edit] ${tag}`, res.status, detail);
    return c.json(ghError(`github ${tag} failed`, res.status, detail), 502);
  };
  const base = await gitHead(c.env);
  if (base instanceof Response) return fail('git', base);
  const oldPath = guidePath(edit.id);
  const { api, ghHeaders } = ghContents(c.env, oldPath);
  const getRes = await fetch(`${api}?ref=${base.head}`, { headers: ghHeaders });
  if (getRes.status === 404) return c.json({ error: 'missing' }, 404);
  if (!getRes.ok) return fail('get', getRes);
  const result = applyGuideEdit(fromBase64((await getRes.json<{ content: string }>()).content), edit);
  if ('error' in result) return c.json({ error: 'invalid edit', detail: result.error }, 400);

  const newId = editedGuideId(edit);
  const renamed = newId !== edit.id;
  if (renamed) {
    const exists = await fetch(`${ghContents(c.env, guidePath(newId)).api}?ref=${base.head}`, { headers: ghHeaders });
    if (exists.ok) return c.json({ error: 'exists', id: newId }, 409);
    if (exists.status !== 404) return fail('get', exists);
  }
  const gone = await existingAssets(c.env, edit.removeImages.map((f) => `${IMAGE_DIR}/${f}`), base.head);
  const r = await commitTree(c.env, base, [
    { path: guidePath(newId), content: result.md },
    ...(renamed ? [{ path: oldPath, remove: true as const }] : []),
    ...gone.map((path) => ({ path, remove: true as const })),
  ], `chore(guide): 從儀表板編輯攻略「${newId}」`);
  if (r === 'conflict') return c.json({ error: 'sha conflict' }, 409);
  if (r !== true) return fail('git', r);
  // 典藏記在 D1（guide:<id>），改名後跟著搬
  if (renamed) await moveState(c.env.DB, `guide:${edit.id}`, `guide:${newId}`);
  return c.json({ ok: true, id: newId });
});

// 改一句待辦的文字（勾選狀態照舊；D1 的勾選記錄 key 是文字雜湊，跟著搬）。
app.post('/api/todo/update', async (c) => {
  const body = await c.req.json<{ text?: unknown; next?: unknown }>().catch(() => null);
  const text = parseTodoText({ text: body?.text });
  const next = parseTodoText({ text: body?.next });
  if (typeof text !== 'string') return c.json({ error: 'invalid todo', detail: text.error }, 400);
  if (typeof next !== 'string') return c.json({ error: 'invalid todo', detail: next.error }, 400);
  if (text === next) return c.json({ ok: true });
  const { api, ghHeaders } = ghContents(c.env, TODO_PATH);
  const getRes = await fetch(`${api}?ref=${c.env.GH_BRANCH}`, { headers: ghHeaders });
  if (!getRes.ok) {
    const detail = await getRes.text();
    return c.json(ghError('github get failed', getRes.status, detail), 502);
  }
  const file = await getRes.json<{ content: string; sha: string }>();
  const out = renameTodo(fromBase64(file.content), text, next);
  if (out === 'missing') return c.json({ error: 'missing' }, 404);
  if (out === 'exists') return c.json({ error: 'exists' }, 409);
  const putRes = await fetch(api, {
    method: 'PUT',
    headers: { ...ghHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `chore(todo): 從儀表板修改待辦「${next}」`, content: toBase64(out), sha: file.sha, branch: c.env.GH_BRANCH }),
  });
  if (putRes.status === 409) return c.json({ error: 'sha conflict' }, 409);
  if (!putRes.ok) {
    const detail = await putRes.text();
    return c.json(ghError('github put failed', putRes.status, detail), 502);
  }
  await moveState(c.env.DB, todoKey(text), todoKey(next));
  return c.json({ ok: true });
});

export default app;
