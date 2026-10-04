import { describe, it, expect } from 'vitest';
import { boatOffset, chordPose, nearestS, polyline, strollOffset, tripS, wheelDeg, wheelPoint, type Trip } from '../diorama-motion';
import { CAR, TRAIN, posesAt } from '../diorama-poses';

describe('polyline', () => {
  const line = polyline([[0, 0], [100, 0]]);

  it('直線的長度與等速插值', () => {
    expect(line.length).toBeCloseTo(100, 5);
    expect(line.at(25)[0]).toBeCloseTo(25, 5);
    expect(line.at(25)[1]).toBeCloseTo(0, 5);
  });

  it('超出兩端沿切線往外延伸（車子從畫面外開進來）', () => {
    expect(line.at(-10)[0]).toBeCloseTo(-10, 5);
    expect(line.at(110)[0]).toBeCloseTo(110, 5);
  });

  it('nearestS 找回最近的位置', () => {
    expect(nearestS(line, [40, 3])).toBeCloseTo(40, 0);
  });

  it('chordPose：前後兩點的中點與連線角度', () => {
    const p = chordPose(line, 50, 20);
    expect(p.x).toBeCloseTo(50, 5);
    expect(p.deg).toBeCloseTo(0, 5);
  });
});

describe('tripS 循環', () => {
  const trip: Trip = { sIn: -10, sOut: 110, travel: 12, period: 20, s0: 50 };

  it('t = 0 在原位，整個週期後回到原位', () => {
    expect(tripS(0, trip)).toBeCloseTo(50, 5);
    expect(tripS(20, trip)).toBeCloseTo(50, 5);
  });

  it('走完一趟後在畫面外等（回傳 null）', () => {
    // 從 s0=50 走到 sOut=110 要 6 秒，接著藏 8 秒
    expect(tripS(7, trip)).toBeNull();
    expect(tripS(13, trip)).toBeNull();
    expect(tripS(15, trip)).not.toBeNull();
  });
});

describe('小船、散步、摩天輪', () => {
  it('t = 0 全部在原位', () => {
    const b = boatOffset(0, [1, 0], 10);
    expect(b.dx).toBeCloseTo(0, 6); expect(b.dy).toBeCloseTo(0, 6); expect(b.deg).toBeCloseTo(0, 6);
    const s = strollOffset(0, 10, 8);
    expect(s.dx).toBeCloseTo(0, 6); expect(s.dy).toBeCloseTo(0, 6); expect(s.flip).toBe(false);
    expect(wheelDeg(0)).toBe(0);
  });

  it('散步往左走時翻面', () => {
    expect(strollOffset(3, 10, 8).flip).toBe(true); // cos(2π·3/8) < 0
    expect(strollOffset(7, 10, 8).flip).toBe(false);
  });

  it('摩天輪上的點落在橢圓上', () => {
    const [x, y] = wheelPoint([0, 0], 10, 20, 0, Math.PI / 2);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(20, 6);
  });
});

describe('posesAt（實際地景）', () => {
  const identity = (tr: string) => {
    const m = tr.match(/^translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\) scale\(([-\d.]+)\) translate\(([-\d.]+) ([-\d.]+)\)$/);
    expect(m).not.toBeNull();
    const [, x, y, deg, sc, nx, ny] = m!.map(Number);
    expect(x + nx).toBeCloseTo(0, 1); expect(y + ny).toBeCloseTo(0, 1);
    expect(deg).toBeCloseTo(0, 1); expect(sc).toBeCloseTo(1, 2);
  };

  it('t = 0 火車、汽車都停在原圖位置（不旋轉、不縮放），汽車用近處那張', () => {
    const p = posesAt(0);
    identity(p.train!);
    identity(p.car!.near);
    expect(p.car!.fade).toBe(0);
    expect(p.cabins).toHaveLength(15);
  });

  it('汽車開上坡後交叉淡化成遠處那張，火車與汽車都會在畫面外等下一趟', () => {
    const fades = Array.from({ length: CAR.travel * 10 }, (_, i) => posesAt(i / 10).car?.fade ?? 0);
    expect(Math.max(...fades)).toBe(1);
    const hiddenTrain = Array.from({ length: TRAIN.period * 2 }, (_, i) => posesAt(i / 2).train).some((x) => x === null);
    const hiddenCar = Array.from({ length: CAR.period * 2 }, (_, i) => posesAt(i / 2).car).some((x) => x === null);
    expect(hiddenTrain).toBe(true);
    expect(hiddenCar).toBe(true);
  });
});
