export function apiBase(): string | undefined { return import.meta.env.VITE_API_BASE as string | undefined; }
const TOKEN_KEY = 'austria-dash-token';
const QUEUE_KEY = 'austria-state-queue';

export function getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t: string): void { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken(): void { localStorage.removeItem(TOKEN_KEY); }
export function configured(): boolean { return !!apiBase() && !!getToken(); }

/** 以共用密碼向 Worker 換取寫入 token；成功存入本機回 true，密碼錯誤回 false。 */
export async function login(password: string): Promise<boolean> {
  const res = await fetch(`${apiBase()}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (res.status === 401) return false;
  if (!res.ok) throw new Error(`POST login ${res.status}`);
  const { token } = await res.json() as { token: string };
  setToken(token);
  return true;
}

function headers(): HeadersInit {
  return { Authorization: `Bearer ${getToken() ?? ''}`, 'Content-Type': 'application/json' };
}

export async function fetchState(): Promise<Record<string, boolean>> {
  const res = await fetch(`${apiBase()}/api/state`, { headers: headers() });
  if (!res.ok) throw new Error(`GET state ${res.status}`);
  return res.json();
}

export async function putState(key: string, value: boolean): Promise<void> {
  const res = await fetch(`${apiBase()}/api/state/${encodeURIComponent(key)}`, {
    method: 'PUT', headers: headers(), body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`PUT state ${res.status}`);
}

type Queue = Record<string, boolean>;
function readQueue(): Queue {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '{}'); } catch { return {}; }
}

export function queuePut(key: string, value: boolean): void {
  const q = readQueue();
  q[key] = value;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export async function flushQueue(): Promise<number> {
  const q = readQueue();
  const entries = Object.entries(q);
  if (entries.length === 0) return 0;
  let sent = 0;
  for (const [key, value] of entries) {
    try {
      await putState(key, value);
      delete q[key];
      sent++;
    } catch { break; }
  }
  if (Object.keys(q).length === 0) localStorage.removeItem(QUEUE_KEY);
  else localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  return sent;
}

/** 讀取網址 ?setup=<token>：存入本機並從網址移除（避免留在瀏覽紀錄）。回傳是否有處理。 */
export function consumeSetupToken(): boolean {
  const params = new URLSearchParams(location.search);
  const t = params.get('setup');
  if (!t) return false;
  setToken(t);
  params.delete('setup');
  const qs = params.toString();
  history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
  return true;
}

/** 產生給新裝置用的設定連結（點一次即完成同步設定）。 */
export function setupLink(token: string): string {
  return `${location.origin}${location.pathname}?setup=${encodeURIComponent(token)}`;
}