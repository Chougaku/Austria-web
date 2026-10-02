// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { queuePut, flushQueue, setToken, getToken, consumeSetupToken, setupLink, login, clearToken } from '../state';

describe('offline queue', () => {
  beforeEach(() => {
    localStorage.clear();
    setToken('t');
  });

  it('queuePut 累積、flushQueue 送出並清空', async () => {
    queuePut('fav:a', true);
    queuePut('fav:b', false);
    queuePut('fav:a', false); // 同 key 後蓋前
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(String(url));
      return new Response('{"ok":true}', { status: 200 });
    }));
    const n = await flushQueue();
    expect(n).toBe(2); // a、b 各一筆（a 取最後值）
    expect(localStorage.getItem('austria-state-queue')).toBeNull();
  });

  it('送出失敗保留佇列', async () => {
    queuePut('fav:a', true);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('err', { status: 500 })));
    await expect(flushQueue()).resolves.toBe(0);
    expect(JSON.parse(localStorage.getItem('austria-state-queue')!)).toHaveProperty('fav:a');
  });
});

describe('setup 連結', () => {
  beforeEach(() => localStorage.clear());

  it('有 setup 參數：存 token、從網址移除、保留 hash', () => {
    history.replaceState(null, '', '/Austria-web/?setup=abc123&x=1#food');
    expect(consumeSetupToken()).toBe(true);
    expect(getToken()).toBe('abc123');
    expect(location.search).toBe('?x=1');
    expect(location.hash).toBe('#food');
  });

  it('無參數或空值：不動作、不覆寫既有 token', () => {
    setToken('keep');
    history.replaceState(null, '', '/Austria-web/');
    expect(consumeSetupToken()).toBe(false);
    history.replaceState(null, '', '/Austria-web/?setup=');
    expect(consumeSetupToken()).toBe(false);
    expect(getToken()).toBe('keep');
  });

  it('setupLink 產生含 encode 過 token 的連結', () => {
    history.replaceState(null, '', '/Austria-web/');
    expect(setupLink('a b')).toBe(`${location.origin}/Austria-web/?setup=a%20b`);
  });
});

describe('login / clearToken', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv('VITE_API_BASE', 'http://api.test');
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('login 密碼正確：存 token、回 true', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ token: 'HEXTOKEN' }), { status: 200 })));
    await expect(login('0509')).resolves.toBe(true);
    expect(getToken()).toBe('HEXTOKEN');
  });

  it('login 密碼錯誤：回 false、不存 token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"invalid password"}', { status: 401 })));
    await expect(login('9999')).resolves.toBe(false);
    expect(getToken()).toBeNull();
  });

  it('clearToken 清除 token', () => {
    setToken('x');
    clearToken();
    expect(getToken()).toBeNull();
  });
});
