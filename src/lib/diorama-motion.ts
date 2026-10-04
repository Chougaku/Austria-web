// 立體地景裡會動的東西：沿路徑走的火車與汽車、湖上晃的小船、來回散步的人、轉動的摩天輪。
// 全部是時間 t（秒）的純函式，座標是網站底圖的 1600×945；t = 0 時每樣東西都在原圖的位置。

export type Pt = readonly [number, number];

export interface Polyline {
  length: number;
  /** 沿線距離 s 的座標（s 超出兩端時沿端點切線往外延伸，讓車子能從畫面外開進來）。 */
  at(s: number): Pt;
}

/** Catmull-Rom 平滑後密集取樣，再用累積長度等速插值。 */
export function polyline(points: readonly Pt[], samples = 12): Polyline {
  const dense: Pt[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    for (let k = 0; k < samples; k++) {
      const t = k / samples, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  dense.push(points[points.length - 1]);
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const length = cum[cum.length - 1];

  const extend = (from: Pt, to: Pt, d: number): Pt => {
    const l = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
    return [to[0] + ((to[0] - from[0]) / l) * d, to[1] + ((to[1] - from[1]) / l) * d];
  };

  return {
    length,
    at(s) {
      if (s <= 0) return extend(dense[1], dense[0], -s);
      if (s >= length) return extend(dense[dense.length - 2], dense[dense.length - 1], s - length);
      let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
      const u = (s - cum[lo]) / (cum[hi] - cum[lo] || 1);
      return [dense[lo][0] + (dense[hi][0] - dense[lo][0]) * u, dense[lo][1] + (dense[hi][1] - dense[lo][1]) * u];
    },
  };
}

/** 路徑上離 p 最近的位置（沿線距離）。 */
export function nearestS(line: Polyline, p: Pt, step = 0.5): number {
  let best = 0, bestD = Infinity;
  for (let s = 0; s <= line.length; s += step) {
    const q = line.at(s), d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

/** 車身前後兩點都貼著路徑：位置取兩點中點、角度取兩點連線——長長的火車過彎也不會脫軌。 */
export function chordPose(line: Polyline, s: number, wheelbase: number): { x: number; y: number; deg: number } {
  const f = line.at(s + wheelbase / 2), r = line.at(s - wheelbase / 2);
  return { x: (f[0] + r[0]) / 2, y: (f[1] + r[1]) / 2, deg: (Math.atan2(f[1] - r[1], f[0] - r[0]) * 180) / Math.PI };
}

export interface Trip {
  /** 進場前、出場後各留多少距離（整台車藏在畫面外）。 */
  sIn: number;
  sOut: number;
  /** 走完一趟的秒數、整個循環的秒數（其餘時間在畫面外等）。 */
  travel: number;
  period: number;
  /** t = 0 時的位置（原圖上的位置）。 */
  s0: number;
}

/** 循環中的位置；在畫面外等的那段回傳 null。 */
export function tripS(t: number, trip: Trip): number | null {
  const span = trip.sOut - trip.sIn;
  const t0 = ((trip.s0 - trip.sIn) / span) * trip.travel;
  const tau = (((t + t0) % trip.period) + trip.period) % trip.period;
  return tau < trip.travel ? trip.sIn + (tau / trip.travel) * span : null;
}

/** 小船：沿船身方向前後漂、輕輕搖。 */
export function boatOffset(t: number, axis: Pt, amp: number): { dx: number; dy: number; deg: number } {
  const d = amp * Math.sin((2 * Math.PI * t) / 16);
  // 上下晃與搖擺用不同週期才不呆板；全部從 0 起算，t = 0 時剛好在原位
  return { dx: axis[0] * d, dy: axis[1] * d + 0.45 * Math.sin((2 * Math.PI * t) / 2.6), deg: 1.2 * Math.sin((2 * Math.PI * t) / 3.4) };
}

/** 散步的人：左右來回，往左走時左右翻面；走動時一步一步輕微上下。 */
export function strollOffset(t: number, amp: number, period: number): { dx: number; dy: number; flip: boolean } {
  const w = (2 * Math.PI) / period;
  const v = Math.cos(w * t);
  return { dx: amp * Math.sin(w * t), dy: -0.7 * Math.abs(Math.sin((2 * Math.PI * t) / 0.8)) * Math.abs(v), flip: v < 0 };
}

/** 摩天輪轉角（度）。 */
export const wheelDeg = (t: number, period = 50) => ((360 * t) / period) % 360;

/** 橢圓上（輪框平面角 a 弧度、半徑比例 k）的點：圓先縮放成 rx×ry，再整體轉 rotDeg。 */
export function wheelPoint(c: Pt, rx: number, ry: number, rotDeg: number, a: number, k = 1): Pt {
  const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k, r = (rotDeg * Math.PI) / 180;
  return [c[0] + x * Math.cos(r) - y * Math.sin(r), c[1] + x * Math.sin(r) + y * Math.cos(r)];
}
