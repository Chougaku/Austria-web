import { describe, it, expect } from 'vitest';
import { pickOverride } from '../itinerary';

const sampleDays = [{ label: 'Day 0', date: 'x', theme: 'y', areas: [], slots: [{ time: 'a', title: 'b', note: '', pending: false }] }];

describe('pickOverride', () => {
  it('無 override 回 null', () => {
    expect(pickOverride(null, '2026-07-09T00:00:00.000Z')).toBeNull();
  });
  it('baseBuiltAt 早於目前 builtAt（CI 已重建）→ 丟棄回 null', () => {
    const stored = { baseBuiltAt: '2026-07-08T00:00:00.000Z', days: sampleDays };
    expect(pickOverride(stored, '2026-07-09T00:00:00.000Z')).toBeNull();
  });
  it('baseBuiltAt 不早於目前 builtAt → 套用', () => {
    const stored = { baseBuiltAt: '2026-07-09T00:00:00.000Z', days: sampleDays };
    expect(pickOverride(stored, '2026-07-09T00:00:00.000Z')).toEqual(sampleDays);
  });
});
