import { describe, it, expect, vi, afterEach } from 'vitest';
import app, { allowOrigin, ghError, originList } from '../src/index';

/** 極簡 in-memory D1 假件，只支援本 Worker 用到的語法 */
function fakeD1() {
  const rows = new Map<string, { key: string; value: string; updated_at: string }>();
  return {
    prepare(_sql: string) {
      return {
        bind(...args: string[]) {
          return {
            async run() {
              rows.set(args[0], { key: args[0], value: args[1], updated_at: args[2] });
              return { success: true };
            },
          };
        },
        async all() {
          return { results: [...rows.values()] };
        },
      };
    },
  };
}

const env = { DB: fakeD1() as unknown, DASH_TOKEN: 'secret123', DASH_PASSWORD: '0509' };
const auth = { Authorization: 'Bearer secret123' };

describe('worker API', () => {
  it('GET 免驗證，公開讀取', async () => {
    const res = await app.request('/api/state', {}, env);
    expect(res.status).toBe(200);
  });

  it('PUT 無 token 拒絕', async () => {
    const res = await app.request('/api/state/x', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: true }),
    }, env);
    expect(res.status).toBe(401);
  });

  it('PUT 錯 token 拒絕', async () => {
    const res = await app.request('/api/state/x', {
      method: 'PUT', headers: { Authorization: 'Bearer wrong', 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: true }),
    }, env);
    expect(res.status).toBe(401);
  });

  it('PUT 後 GET 讀得回來', async () => {
    const put = await app.request('/api/state/' + encodeURIComponent('fav:餐廳/測試'), {
      method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: true }),
    }, env);
    expect(put.status).toBe(200);
    const res = await app.request('/api/state', { headers: auth }, env);
    const map = await res.json() as Record<string, boolean>;
    expect(map['fav:餐廳/測試']).toBe(true);
  });

  it('value:false 覆寫', async () => {
    await app.request('/api/state/' + encodeURIComponent('fav:餐廳/測試'), {
      method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: false }),
    }, env);
    const res = await app.request('/api/state', { headers: auth }, env);
    const map = await res.json() as Record<string, boolean>;
    expect(map['fav:餐廳/測試']).toBe(false);
  });

  it('POST /api/login 密碼正確回傳 token', async () => {
    const res = await app.request('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '0509' }),
    }, env);
    expect(res.status).toBe(200);
    const body = await res.json() as { token: string };
    expect(body.token).toBe('secret123');
  });

  it('POST /api/login 密碼錯誤回 401', async () => {
    const res = await app.request('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '9999' }),
    }, env);
    expect(res.status).toBe(401);
  });

  it('POST /api/login 沒帶密碼或格式壞掉回 401', async () => {
    for (const body of ['{}', 'not json', JSON.stringify({ password: 509 })]) {
      const res = await app.request('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
      }, env);
      expect(res.status).toBe(401);
    }
  });

  it('secret 還沒設：登入回 503、`Bearer undefined` 不能寫入', async () => {
    const bare = { DB: fakeD1() as unknown };
    const login = await app.request('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }, bare);
    expect(login.status).toBe(503);
    const put = await app.request('/api/state/x', {
      method: 'PUT', headers: { Authorization: 'Bearer undefined', 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: true }),
    }, bare);
    expect(put.status).toBe(401);
  });
});

function b64(str: string) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const x of bytes) bin += String.fromCharCode(x);
  return btoa(bin);
}
function unb64(s: string) {
  const bin = atob(s.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const itinEnv = {
  DB: fakeD1() as unknown,
  DASH_TOKEN: 'secret123', DASH_PASSWORD: '0509',
  GH_OWNER: 'o', GH_REPO: 'r', GH_BRANCH: 'main',
  GH_ITINERARY_PATH: 'wiki/dashboard/每日行程.md',
  GITHUB_TOKEN: 'ghtok',
};

describe('worker itinerary API', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('PUT /api/itinerary 無 token 拒絕', async () => {
    const res = await app.request('/api/itinerary', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daySectionsMarkdown: '## Day 0｜x｜y\n- a｜b\n' }),
    }, itinEnv);
    expect(res.status).toBe(401);
  });

  it('PUT /api/itinerary 保留前言、換行程區塊、帶 sha', async () => {
    const current =
      '---\ntitle: 每日行程\n---\n\n# 每日行程\n\n> 格式規則：略\n\n' +
      '## Day 0｜06/14｜舊\n> 區域：維也納\n\n- 上午｜舊行程\n';
    let putBody: { content: string; sha: string } | null = null;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init || init.method !== 'PUT') {
        return new Response(JSON.stringify({ content: b64(current), sha: 'sha123' }), { status: 200 });
      }
      putBody = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }));

    const newSections = '## Day 0｜06/14｜新主題\n> 區域：格拉茨\n\n- 上午｜新行程｜備註\n';
    const res = await app.request('/api/itinerary', {
      method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ daySectionsMarkdown: newSections }),
    }, itinEnv);

    expect(res.status).toBe(200);
    expect(putBody!.sha).toBe('sha123');
    const decoded = unb64(putBody!.content);
    expect(decoded).toContain('> 格式規則：略');       // 前言保留
    expect(decoded).toContain('## Day 0｜06/14｜新主題'); // 新行程進去
    expect(decoded).not.toContain('## Day 0｜06/14｜舊'); // 舊行程被替換
  });

  it('PUT /api/itinerary GitHub 回 409 → 回 409', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init || init.method !== 'PUT') {
        return new Response(JSON.stringify({ content: b64('# x\n\n## Day 0｜a｜b\n- t｜x\n'), sha: 's' }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: 'conflict' }), { status: 409 });
    }));
    const res = await app.request('/api/itinerary', {
      method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ daySectionsMarkdown: '## Day 0｜a｜b\n- t｜x\n' }),
    }, itinEnv);
    expect(res.status).toBe(409);
  });
});

describe('CORS 來源', () => {
  it('正式網域與本機任意 port 都放行，其他一律擋', () => {
    expect(allowOrigin('https://austria.pages.dev')).toBe('https://austria.pages.dev');
    expect(allowOrigin('https://chougaku.github.io')).toBe('https://chougaku.github.io');
    expect(allowOrigin('http://localhost:5173')).toBe('http://localhost:5173');
    expect(allowOrigin('http://localhost:5178')).toBe('http://localhost:5178');
    expect(allowOrigin('http://127.0.0.1:4173')).toBe('http://127.0.0.1:4173');
    expect(allowOrigin('https://evil.example.com')).toBeNull();
    expect(allowOrigin('http://localhost.evil.com')).toBeNull();
  });

  it('白名單可由 ALLOWED_ORIGINS 覆寫（綁自訂網域用）', () => {
    const list = originList('https://austria.example.com, https://chougaku.github.io');
    expect(allowOrigin('https://austria.example.com', list)).toBe('https://austria.example.com');
    expect(allowOrigin('https://austria.pages.dev', list)).toBeNull();
    expect(originList('')).toContain('https://austria.pages.dev');
  });

  it('本機 dev 的預檢帶得回 Allow-Origin', async () => {
    const res = await app.request('/api/itinerary', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5178',
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
    }, itinEnv);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5178');
  });
});

describe('GitHub 錯誤分類', () => {
  it('401/403 標成 github-auth，其餘照狀態碼分', () => {
    expect(ghError('x', 401, 'Bad credentials').reason).toBe('github-auth');
    expect(ghError('x', 403, 'forbidden').reason).toBe('github-auth');
    expect(ghError('x', 404, 'not found').reason).toBe('github-missing');
    expect(ghError('x', 500, 'boom').reason).toBe('github');
  });

  it('detail 截短，避免把 GitHub 整包回應吐回前端', () => {
    expect(ghError('x', 500, 'z'.repeat(1000)).detail).toHaveLength(300);
  });
});

describe('itinerary GitHub token 失效', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('GitHub 回 401 → 502 且 reason=github-auth', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Bad credentials' }), { status: 401 })));
    const res = await app.request('/api/itinerary', {
      method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ daySectionsMarkdown: '## Day 0｜a｜b\n- t｜x\n' }),
    }, itinEnv);
    expect(res.status).toBe(502);
    const body = await res.json() as { reason: string; status: number };
    expect(body.reason).toBe('github-auth');
    expect(body.status).toBe(401);
  });
});
