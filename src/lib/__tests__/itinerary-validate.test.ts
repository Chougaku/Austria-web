import { describe, it, expect } from 'vitest';
import { findInvalidField } from '../itinerary-validate';

const day = (label: string, slots: { time: string; title: string; pending?: boolean }[]) => ({
  label, date: 'x', theme: 'y', areas: [] as string[],
  slots: slots.map((s) => ({ time: s.time, title: s.title, note: '', pending: s.pending ?? false })),
});

describe('findInvalidField', () => {
  it('全部合法 → null', () => {
    expect(findInvalidField([day('Day 0', [{ time: '上午', title: '維也納機場' }])])).toBeNull();
  });

  it('空時間 → 指出是哪一天的第幾個時段、哪一欄', () => {
    const days = [
      day('Day 0', [{ time: '上午', title: '維也納機場' }]),
      day('Day 1', [{ time: '上午', title: '美泉宮' }, { time: '  ', title: '格拉本' }]),
    ];
    expect(findInvalidField(days)).toEqual({
      dayIdx: 1, slotIdx: 1, field: 'time', message: 'Day 1 第 2 個時段的「時間」是空的',
    });
  });

  it('非待安排卻沒標題 → 指向 title 欄', () => {
    const days = [day('Day 0', [{ time: '上午', title: '' }])];
    expect(findInvalidField(days)).toEqual({
      dayIdx: 0, slotIdx: 0, field: 'title', message: 'Day 0 第 1 個時段的「標題」是空的',
    });
  });

  it('待安排的時段允許沒有標題', () => {
    expect(findInvalidField([day('Day 0', [{ time: '上午', title: '', pending: true }])])).toBeNull();
  });

  it('整天沒有時段 → 指向該天，沒有可聚焦的欄位', () => {
    const days = [day('Day 0', [{ time: '上午', title: '維也納機場' }]), day('Day 1', [])];
    expect(findInvalidField(days)).toEqual({
      dayIdx: 1, slotIdx: null, field: null, message: 'Day 1 至少要有一個時段',
    });
  });
});
