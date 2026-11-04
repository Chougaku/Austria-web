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

/** 網站上改過字的待辦（舊文字 → 新文字）：一樣是網站重建前先顯示新文字，重建後作廢。 */
const RENAME_KEY = 'austria-todo-renames';
type StoredRenames = { builtAt: string; map: Record<string, string> };
let renames: Record<string, string> | null = null;

function readRenames(): Record<string, string> {
  if (renames) return renames;
  try {
    const s = JSON.parse(localStorage.getItem(RENAME_KEY) ?? 'null') as StoredRenames | null;
    renames = s && s.builtAt === meta.builtAt ? s.map : {};
  } catch { renames = {}; }
  return renames;
}

export function markTodoRenamed(text: string, next: string): void {
  // 同一句連改兩次：最早那個原文都指到最新的字
  const prev = readRenames();
  const original = Object.keys(prev).find((k) => prev[k] === text) ?? text;
  renames = { ...prev, [original]: next };
  try { localStorage.setItem(RENAME_KEY, JSON.stringify({ builtAt: meta.builtAt, map: renames })); } catch { /* 忽略 */ }
  for (const l of listeners) l();
}

/** 原本的待辦文字 → 現在要顯示的文字（沒改過的不在裡面）。 */
export function useTodoRenames(): Record<string, string> {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, readRenames);
}

/** 測試用：清掉記憶體裡的清單，下次重讀 localStorage。 */
export function resetDeletedCache(): void { current = null; renames = null; }
