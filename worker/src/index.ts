import { Hono } from 'hono';
import { cors } from 'hono/cors';

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
  const open = c.req.method === 'GET' || c.req.method === 'OPTIONS' || c.req.path === '/api/login';
  if (!open && c.req.header('Authorization') !== `Bearer ${c.env.DASH_TOKEN}`) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
});

// 以共用密碼換取寫入用的 token。
app.post('/api/login', async (c) => {
  const { password } = await c.req.json<{ password: string }>();
  if (password !== c.env.DASH_PASSWORD) {
    return c.json({ error: 'invalid password' }, 401);
  }
  return c.json({ token: c.env.DASH_TOKEN });
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

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
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

app.put('/api/itinerary', async (c) => {
  const { daySectionsMarkdown } = await c.req.json<{ daySectionsMarkdown: string }>();
  if (typeof daySectionsMarkdown !== 'string' || !daySectionsMarkdown.includes('## Day ')) {
    return c.json({ error: 'invalid itinerary' }, 400);
  }
  const { GH_OWNER, GH_REPO, GH_BRANCH, GH_ITINERARY_PATH, GITHUB_TOKEN } = c.env;
  const api = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURI(GH_ITINERARY_PATH)}`;
  const ghHeaders = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    'User-Agent': 'austria-dashboard-worker',
    Accept: 'application/vnd.github+json',
  };

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

export default app;
