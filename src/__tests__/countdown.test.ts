import { describe, it, expect } from 'vitest';
import { countdownDays } from '../lib/countdown';

describe('countdownDays', () => {
  it('以台灣時間零時起算、無條件進位', () => {
    expect(countdownDays('2027-06-14', new Date('2027-06-12T00:00:00+08:00'))).toBe(2);
    expect(countdownDays('2027-06-14', new Date('2027-06-13T23:00:00+08:00'))).toBe(1);
  });
  it('過期歸零', () => {
    expect(countdownDays('2027-06-14', new Date('2027-06-20T00:00:00+08:00'))).toBe(0);
  });
});
