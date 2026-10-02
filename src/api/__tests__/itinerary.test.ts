// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { putItinerary, itineraryErrorMessage } from '../itinerary';

beforeEach(() => {
  localStorage.setItem('austria-dash-token', 'tok');
  vi.stubEnv('VITE_API_BASE', 'https://api.test');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); localStorage.clear(); });

describe('putItinerary', () => {
  it('成功時帶 Bearer token 與正確 body', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await putItinerary('## Day 0｜a｜b\n- t｜x\n');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/api/itinerary');
    expect(init!.method).toBe('PUT');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(init!.body as string).daySectionsMarkdown).toContain('## Day 0');
  });

  it('409 拋出重新整理訊息', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 409 })));
    await expect(putItinerary('## Day 0｜a｜b\n')).rejects.toThrow('重新整理');
  });

  it('401 要人重新登入，而不是丟 HTTP 碼', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })));
    await expect(putItinerary('## Day 0X')).rejects.toThrow('重新登入');
  });

  it('GitHub token 失效（502 + github-auth）指名要換 GITHUB_TOKEN', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: 'github get failed', reason: 'github-auth', status: 401, detail: 'Bad credentials' }),
      { status: 502 },
    )));
    await expect(putItinerary('## Day 0X')).rejects.toThrow('GITHUB_TOKEN');
  });

  it('連不上（fetch reject）給的是人話，不是 Failed to fetch', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(putItinerary('## Day 0X')).rejects.toThrow('連不上伺服器');
  });

  it('逾時中止時說明是逾時', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('timeout', 'TimeoutError'); }));
    await expect(putItinerary('## Day 0X')).rejects.toThrow('逾時');
  });
});

describe('itineraryErrorMessage', () => {
  it('各狀態都翻成人看得懂的一句話', () => {
    expect(itineraryErrorMessage(401, null)).toContain('重新登入');
    expect(itineraryErrorMessage(409, null)).toContain('重新整理');
    expect(itineraryErrorMessage(400, null)).toContain('格式');
    expect(itineraryErrorMessage(502, { reason: 'github-missing' })).toContain('每日行程檔');
    expect(itineraryErrorMessage(502, { reason: 'github', status: 500 })).toContain('寫回 GitHub 失敗');
    expect(itineraryErrorMessage(503, null)).toContain('503');
  });
});
