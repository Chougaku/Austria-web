// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { AuthProvider, useAuth } from '../auth';

const wrapper = AuthProvider;

function fakeLocation() {
  return { reload: vi.fn(), assign: vi.fn(), replace: vi.fn(),
    href: 'http://localhost/', origin: 'http://localhost', pathname: '/', search: '', hash: '' };
}

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv('VITE_API_BASE', 'http://api.test');
    vi.stubGlobal('location', fakeLocation());
  });
  afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('無 token：canEdit 為 false', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.canEdit).toBe(false);
  });

  it('有 token 與 apiBase：canEdit 為 true', () => {
    localStorage.setItem('austria-dash-token', 'tok');
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.canEdit).toBe(true);
  });

  it('openLogin / closeLogin 切換 loginOpen', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loginOpen).toBe(false);
    act(() => result.current.openLogin());
    expect(result.current.loginOpen).toBe(true);
    act(() => result.current.closeLogin());
    expect(result.current.loginOpen).toBe(false);
  });

  it('login 密碼錯誤：回 false、不 reload、不存 token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    const { result } = renderHook(() => useAuth(), { wrapper });
    let ok = true;
    await act(async () => { ok = await result.current.login('9999'); });
    expect(ok).toBe(false);
    expect((location as unknown as ReturnType<typeof fakeLocation>).reload).not.toHaveBeenCalled();
    expect(localStorage.getItem('austria-dash-token')).toBeNull();
  });

  it('logout：清 token 並 reload', () => {
    localStorage.setItem('austria-dash-token', 'tok');
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.logout());
    expect(localStorage.getItem('austria-dash-token')).toBeNull();
    expect((location as unknown as ReturnType<typeof fakeLocation>).reload).toHaveBeenCalled();
  });
});
