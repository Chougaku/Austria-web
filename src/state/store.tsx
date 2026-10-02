import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { entities, todos } from '../data';
import { apiBase, configured, fetchState, flushQueue, getToken, putState, queuePut } from '../api/state';

const LS_KEY = 'austria-trip-state';
const SYNC_MIN_INTERVAL_MS = 15000;
type StateMap = Record<string, boolean>;

function defaults(): StateMap {
  const d: StateMap = {};
  for (const e of entities) if (e.favorite) d[`fav:${e.id}`] = true;
  for (const t of todos) if (t.checkedInVault) d[t.key] = true;
  return d;
}
function loadLocal(): StateMap {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}'); } catch { return {}; }
}
function saveLocal(s: StateMap) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* 忽略 */ }
}

interface TripState {
  favs: StateMap; todosState: StateMap; guideFavs: StateMap;
  toggleFav(entityId: string): void; toggleTodo(key: string): void;
  toggleGuideFav(guideId: string): void;
  isFav(entityId: string): boolean; isGuideFav(guideId: string): boolean;
  favCount: number; offline: boolean;
  syncing: boolean;
}
const Ctx = createContext<TripState | null>(null);

export function TripStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StateMap>(() => ({ ...defaults(), ...loadLocal() }));
  const [offline, setOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const lastSyncRef = useRef(0);

  // 補送離線佇列 → 拉遠端狀態合併（遠端優先）。啟動與切回前景共用。
  const syncRemote = useCallback(async () => {
    if (!apiBase()) { setOffline(true); return; }
    setSyncing(true);
    try {
      if (getToken()) {
        await flushQueue();
      }
      const remote = await fetchState();
      setState((s) => { const merged = { ...s, ...remote }; saveLocal(merged); return merged; });
      setOffline(false);
    } catch { setOffline(true); }
    finally { setSyncing(false); }
  }, []);

  useEffect(() => {
    lastSyncRef.current = Date.now();
    void syncRemote();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastSyncRef.current < SYNC_MIN_INTERVAL_MS) return;
      lastSyncRef.current = Date.now();
      void syncRemote();
    };
    const onOnline = () => { flushQueue().then((n) => { if (n > 0) setOffline(false); }); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [syncRemote]);

  const toggle = useCallback((key: string) => {
    setState((s) => {
      const value = !s[key];
      const next = { ...s, [key]: value };
      saveLocal(next);
      if (configured()) {
        putState(key, value).then(() => setOffline(false)).catch(() => { queuePut(key, value); setOffline(true); });
      }
      return next;
    });
  }, []);

  const value = useMemo<TripState>(() => {
    const favs: StateMap = {}; const todosState: StateMap = {}; const guideFavs: StateMap = {};
    for (const [k, v] of Object.entries(state)) {
      if (k.startsWith('fav:')) favs[k] = v;
      else if (k.startsWith('todo:')) todosState[k] = v;
      else if (k.startsWith('guide:')) guideFavs[k] = v;
    }
    return {
      favs, todosState, guideFavs,
      toggleFav: (id) => toggle(`fav:${id}`),
      toggleTodo: (key) => toggle(key),
      toggleGuideFav: (id) => toggle(`guide:${id}`),
      isFav: (id) => !!state[`fav:${id}`],
      isGuideFav: (id) => !!state[`guide:${id}`],
      favCount: Object.entries(favs).filter(([, v]) => v).length,
      offline,
      syncing,
    };
  }, [state, toggle, offline, syncing]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTripState(): TripState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTripState 必須在 TripStateProvider 內使用');
  return ctx;
}