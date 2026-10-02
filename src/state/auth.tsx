import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { apiBase, clearToken, getToken, login as apiLogin } from '../api/state';

interface Auth {
  canEdit: boolean;
  loginOpen: boolean;
  openLogin(): void;
  closeLogin(): void;
  login(password: string): Promise<boolean>;
  logout(): void;
}
const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loginOpen, setLoginOpen] = useState(false);
  // 有 API 位置且有 token 才能編輯。登入/登出都以 reload 收尾，故掛載時計算即可反映當前狀態。
  const canEdit = !!apiBase() && !!getToken();

  const login = useCallback(async (password: string): Promise<boolean> => {
    const ok = await apiLogin(password);
    if (ok) location.reload(); // 重載後 store 會以新 token 自動同步，愛心解鎖
    return ok;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    location.reload();
  }, []);

  const value = useMemo<Auth>(() => ({
    canEdit, loginOpen,
    openLogin: () => setLoginOpen(true),
    closeLogin: () => setLoginOpen(false),
    login, logout,
  }), [canEdit, loginOpen, login, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth 必須在 AuthProvider 內使用');
  return ctx;
}
