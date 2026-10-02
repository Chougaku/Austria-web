import { describe, it, expect } from 'vitest';
import { parseItinerary } from '../parse-itinerary';

const OK = `---
title: 每日行程
updated: 2026-07-05
---

## Day 0｜06/15 週二｜抵達日
> 區域：維也納、格拉本

- 下午｜維也納機場 → 維也納｜CAT 機場快線 16 分
- 傍晚｜Hotel Sacher Check-in｜Karlsplatz 站步行 5 分
- 宵夜｜（待安排）

## Day 1｜06/16 週三｜美泉宮
> 區域：此花區

- 全日｜美泉宮宮殿｜時段票建議先買
`;

describe('parseItinerary', () => {
  it('解析天數、標頭、區域、時段', () => {
    const days = parseItinerary(OK);
    expect(days).toHaveLength(2);
    expect(days[0]).toMatchObject({
      label: 'Day 0', date: '06/15 週二', theme: '抵達日',
      areas: ['維也納', '格拉本'],
    });
    expect(days[0].slots[0]).toEqual({
      time: '下午', title: '維也納機場 → 維也納', note: 'CAT 機場快線 16 分', pending: false,
    });
  });

  it('（待安排）標成 pending 且 note 為空', () => {
    const days = parseItinerary(OK);
    expect(days[0].slots[2]).toEqual({ time: '宵夜', title: '（待安排）', note: '', pending: true });
  });

  it('備註可省略', () => {
    const days = parseItinerary(OK.replace('｜CAT 機場快線 16 分', ''));
    expect(days[0].slots[0].note).toBe('');
  });

  it('Day 標頭格式錯誤時報錯並含該行', () => {
    expect(() => parseItinerary(OK.replace('## Day 1｜06/16 週三｜美泉宮', '## Day 1 美泉宮')))
      .toThrow(/Day 1 美泉宮/);
  });

  it('沒有任何 Day 時報錯', () => {
    expect(() => parseItinerary('---\ntitle: x\n---\n沒內容')).toThrow(/找不到任何/);
  });
});