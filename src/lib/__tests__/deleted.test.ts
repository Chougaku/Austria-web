// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const meta = vi.hoisted(() => ({ builtAt: '2026-10-31T00:00:00.000Z' }));
vi.mock('../../data', () => ({ meta }));
import { deletedKey, markDeleted, resetDeletedCache, useDeleted } from '../deleted';

afterEach(() => { localStorage.clear(); resetDeletedCache(); meta.builtAt = '2026-10-31T00:00:00.000Z'; });

describe('網站上刪掉、還沒重建的項目', () => {
  it('刪了馬上藏起來，重新整理後還記得', () => {
    const { result } = renderHook(() => useDeleted());
    act(() => markDeleted(deletedKey.entity('餐廳/Öfferl')));
    expect(result.current.has('entity:餐廳/Öfferl')).toBe(true);
    resetDeletedCache(); // 模擬重新整理
    expect(renderHook(() => useDeleted()).result.current.has('entity:餐廳/Öfferl')).toBe(true);
  });

  it('網站重建後（builtAt 變了）清單作廢', () => {
    markDeleted(deletedKey.todo('訂機票'));
    resetDeletedCache();
    meta.builtAt = '2026-11-01T00:00:00.000Z';
    expect(renderHook(() => useDeleted()).result.current.size).toBe(0);
  });
});
