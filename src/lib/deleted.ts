import { useSyncExternalStore } from 'react';
import { meta } from '../data';

/** 網站上刪掉的東西，在網站重建之前先藏起來：資料是建置時打包進網站的，不藏的話重新整理又會冒出來。
    跟著 meta.builtAt 走——網站重建後 vault 裡已經沒有它們，這份清單自動作廢。 */
const KEY = 'austria-deleted';
type Stored = { builtAt: string; keys: string[] };

export const deletedKey = {
  entity: (id: string) => `entity:${id}`,
  guide: (id: string) => `guide:${id}`,
  todo: (text: string) => `todo:${text}`,
};

let current: Set<string> | null = null;
const listeners = new Set<() => void>();

function read(): Set<string> {
  if (current) return current;
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Stored | null;
    current = new Set(s && s.builtAt === meta.builtAt ? s.keys : []);
  } catch { current = new Set(); }
  return current;
}

export function markDeleted(key: string): void {
  current = new Set(read()).add(key);
  try { localStorage.setItem(KEY, JSON.stringify({ builtAt: meta.builtAt, keys: [...current] })); } catch { /* 忽略 */ }
  for (const l of listeners) l();
}

/** 目前藏起來的項目（key 用 deletedKey 組）。 */
export function useDeleted(): Set<string> {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, read);
}

/** 測試用：清掉記憶體裡的清單，下次重讀 localStorage。 */
export function resetDeletedCache(): void { current = null; }
