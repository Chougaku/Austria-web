import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { days as builtDays, meta } from '../data';
import type { Day, DaySlot } from '../data/schema';
import { serializeDays } from '../lib/itinerary-md';
import { putItinerary } from '../api/itinerary';
import { findInvalidField, ItineraryValidationError } from '../lib/itinerary-validate';

const OVERRIDE_KEY = 'austria-itinerary-override';
export type Override = { baseBuiltAt: string; days: Day[] };

/** 只有當 override 的 baseBuiltAt 不早於目前 builtAt 才採用；否則視為已被 CI 重建取代。 */
export function pickOverride(stored: Override | null, builtAt: string): Day[] | null {
  if (!stored) return null;
  if (new Date(stored.baseBuiltAt).getTime() < new Date(builtAt).getTime()) return null;
  return stored.days;
}

function clone(days: Day[]): Day[] {
  return days.map((d) => ({ ...d, areas: [...d.areas], slots: d.slots.map((s) => ({ ...s })) }));
}
function loadOverride(): Day[] | null {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    const picked = pickOverride(raw ? (JSON.parse(raw) as Override) : null, meta.builtAt);
    if (raw && !picked) localStorage.removeItem(OVERRIDE_KEY);
    return picked;
  } catch { return null; }
}
function saveOverride(days: Day[]) {
  try { localStorage.setItem(OVERRIDE_KEY, JSON.stringify({ baseBuiltAt: meta.builtAt, days })); }
  catch { /* 忽略 */ }
}

interface ItineraryState {
  days: Day[]; dirty: boolean; saving: boolean;
  updateSlot(dayIdx: number, slotIdx: number, patch: Partial<DaySlot>): void;
  addSlot(dayIdx: number): void;
  removeSlot(dayIdx: number, slotIdx: number): void;
  moveSlot(dayIdx: number, slotIdx: number, dir: -1 | 1): void;
  save(): Promise<void>;
  reset(): void;
}
const Ctx = createContext<ItineraryState | null>(null);

export function ItineraryProvider({ children }: { children: ReactNode }) {
  const [days, setDays] = useState<Day[]>(() => loadOverride() ?? clone(builtDays));
  const [dirty, setDirty] = useState<boolean>(() => loadOverride() != null);
  const [saving, setSaving] = useState(false);

  const mutate = useCallback((fn: (draft: Day[]) => void) => {
    setDays((prev) => { const next = clone(prev); fn(next); return next; });
    setDirty(true);
  }, []);

  const updateSlot = useCallback((di: number, si: number, patch: Partial<DaySlot>) => mutate((d) => {
    const s = { ...d[di].slots[si], ...patch };
    if (patch.pending === true) { s.title = '（待安排）'; s.note = ''; }
    else if (patch.pending === false && s.title === '（待安排）') { s.title = ''; }
    d[di].slots[si] = s;
  }), [mutate]);

  const addSlot = useCallback((di: number) => mutate((d) => {
    d[di].slots.push({ time: '', title: '', note: '', pending: false });
  }), [mutate]);

  const removeSlot = useCallback((di: number, si: number) => mutate((d) => {
    d[di].slots.splice(si, 1);
  }), [mutate]);

  const moveSlot = useCallback((di: number, si: number, dir: -1 | 1) => mutate((d) => {
    const arr = d[di].slots; const j = si + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[si], arr[j]] = [arr[j], arr[si]];
  }), [mutate]);

  const save = useCallback(async () => {
    const invalid = findInvalidField(days);
    if (invalid) throw new ItineraryValidationError(invalid);
    setSaving(true);
    try {
      await putItinerary(serializeDays(days));
      saveOverride(days);
      setDirty(false);
    } finally { setSaving(false); }
  }, [days]);

  const reset = useCallback(() => {
    setDays(loadOverride() ?? clone(builtDays));
    setDirty(false);
  }, []);

  const value = useMemo<ItineraryState>(
    () => ({ days, dirty, saving, updateSlot, addSlot, removeSlot, moveSlot, save, reset }),
    [days, dirty, saving, updateSlot, addSlot, removeSlot, moveSlot, save, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useItinerary(): ItineraryState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useItinerary 必須在 ItineraryProvider 內使用');
  return ctx;
}
