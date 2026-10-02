import { describe, it, expect } from 'vitest';
import { parseItinerary } from '../../../scripts/lib/parse-itinerary';
import { serializeDays } from '../itinerary-md';

const FIXTURE = `## Day 0｜06/15 週二｜抵達日
> 區域：維也納、格拉本

- 上午｜去程航班｜樂桃航空 MM024
- 傍晚｜Check-in｜步行 5 分
- 宵夜｜（待安排）

## Day 1｜06/16 週三｜美泉宮
> 區域：此花區

- 全日｜美泉宮｜先買時段票
- 晚上｜（待安排）
`;

describe('serializeDays', () => {
  it('固定格式：一般時段、空備註、待安排', () => {
    const days = [{
      label: 'Day 0', date: '06/15 週二', theme: '抵達日',
      areas: ['維也納', '格拉本'],
      slots: [
        { time: '上午', title: '去程航班', note: '樂桃航空 MM024', pending: false },
        { time: '午', title: '退房', note: '', pending: false },
        { time: '宵夜', title: '（待安排）', note: '', pending: true },
      ],
    }];
    expect(serializeDays(days)).toBe(
      '## Day 0｜06/15 週二｜抵達日\n' +
      '> 區域：維也納、格拉本\n\n' +
      '- 上午｜去程航班｜樂桃航空 MM024\n' +
      '- 午｜退房\n' +
      '- 宵夜｜（待安排）\n',
    );
  });

  it('parse→serialize→parse 語意等價（idempotent）', () => {
    const once = parseItinerary(FIXTURE);
    const twice = parseItinerary(serializeDays(once));
    expect(twice).toEqual(once);
  });
});
