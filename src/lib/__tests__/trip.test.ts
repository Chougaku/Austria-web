import { describe, it, expect, vi } from 'vitest';

vi.mock('../../data', () => ({
  meta: { builtAt: '', tripStart: '2027-06-14', tripEnd: '2027-06-30' },
  overview: {
    fields: {},
    stays: [
      { city: '維也納', checkIn: '2027-06-15', checkOut: '2027-06-18', nights: 3, hotel: '', booked: false, parking: '', note: '' },
      { city: '格拉茨', checkIn: '2027-06-18', checkOut: '2027-06-19', nights: 1, hotel: '', booked: false, parking: '', note: '' },
      { city: '鹽湖區', checkIn: '2027-06-19', checkOut: '2027-06-22', nights: 3, hotel: '', booked: false, parking: '', note: '' },
    ],
    legs: [
      { date: '2027-06-14', mode: 'flight', from: '台灣', to: '維也納', note: '' },
      { date: '2027-06-18', mode: 'drive', from: '維也納', to: '格拉茨', note: '' },
      { date: '2027-06-19', mode: 'drive', from: '格拉茨', to: 'Bad Ischl', note: '' },
    ],
    bookings: [],
    transportNotes: [],
  },
}));

const trip = await import('../trip');

describe('dayIso', () => {
  it('每日行程的「06/15 週二」補上出發年份', () => {
    expect(trip.dayIso({ date: '06/15 週二' })).toBe('2027-06-15');
  });
  it('月份比出發月小代表跨年', () => {
    expect(trip.dayIso({ date: '01/02 週六' }, '2026-12-28')).toBe('2027-01-02');
  });
  it('不是日期回 null', () => {
    expect(trip.dayIso({ date: '出發日' })).toBeNull();
  });
});

describe('stayOnNight / legsOn', () => {
  it('入住日算、退房日不算——換城那晚住新城市', () => {
    expect(trip.stayOnNight('2027-06-17')?.city).toBe('維也納');
    expect(trip.stayOnNight('2027-06-18')?.city).toBe('格拉茨');
  });
  it('夜班機那晚沒有住宿', () => {
    expect(trip.stayOnNight('2027-06-14')).toBeUndefined();
    expect(trip.stayOnNight(null)).toBeUndefined();
  });
  it('當天的移動', () => {
    expect(trip.legsOn('2027-06-18').map((l) => l.mode)).toEqual(['drive']);
    expect(trip.legsOn('2027-06-16')).toEqual([]);
  });
});

describe('routeSegments', () => {
  it('相鄰城市配上總覽裡的移動（地名用德文寫也認得）；沒寫的段落 leg 為空', () => {
    const segs = trip.routeSegments();
    expect(segs).toHaveLength(5);
    expect(segs[0]).toMatchObject({ from: { key: 'wien' }, to: { key: 'graz' }, leg: { mode: 'drive' } });
    expect(segs[1].leg?.to).toBe('Bad Ischl');
    expect(segs[2].leg).toBeUndefined();
  });
});

describe('stayOfCity / totalNights', () => {
  it('依城市找住宿、加總晚數', () => {
    expect(trip.stayOfCity('ischl')?.nights).toBe(3);
    expect(trip.stayOfCity('muenchen')).toBeUndefined();
    expect(trip.totalNights()).toBe(7);
  });
});

describe('todayIndex', () => {
  const days = [{ date: '06/14 週一' }, { date: '06/15 週二' }, { date: '06/16 週三' }];
  it('旅途中回今天是第幾天', () => {
    expect(trip.todayIndex(days, new Date(2027, 5, 15, 9))).toBe(1);
  });
  it('行前或行後回 -1', () => {
    expect(trip.todayIndex(days, new Date(2026, 9, 2))).toBe(-1);
  });
});

describe('日期格式', () => {
  it('shortDate／euroDate', () => {
    expect(trip.shortDate('2027-06-05')).toBe('6/5');
    expect(trip.euroDate('2027-06-05')).toBe('05.06.');
  });
});
