// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addEntity, type NewEntityInput } from '../entity';

const input: NewEntityInput = {
  category: '景點', name: '霍夫堡', type: '宮殿', city: '維也納', location: '維也納', address: '', ticket: '', summary: '',
};

beforeEach(() => {
  localStorage.setItem('austria-dash-token', 'tok');
  vi.stubEnv('VITE_API_BASE', 'https://api.test');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); localStorage.clear(); });

describe('addEntity', () => {
  it('POST /api/entity 帶 Bearer token，回傳新實體 id', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ ok: true, id: '景點/霍夫堡' }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await addEntity(input)).toEqual({ id: '景點/霍夫堡' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/api/entity');
    expect(init!.method).toBe('POST');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(init!.body as string)).toEqual(input);
  });

  it('同名已存在、登入失效、欄位不合格各有看得懂的訊息', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'exists' }), { status: 409 })));
    await expect(addEntity(input)).rejects.toThrow('已經有同名的地點');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    await expect(addEntity(input)).rejects.toThrow('重新登入');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ detail: '名稱太長（最多 80 字）' }), { status: 400 })));
    await expect(addEntity(input)).rejects.toThrow('名稱太長');
  });

  it('連不上伺服器', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(addEntity(input)).rejects.toThrow('連不上伺服器');
  });
});
