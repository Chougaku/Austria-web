// 立體地景每個時間點的姿勢（SVG transform 字串），元件只負責套用。t = 0 時全部在原圖位置。
import { diorama as scene, type SpriteBox } from '../data/diorama';
import { boatOffset, chordPose, nearestS, polyline, strollOffset, tripS, wheelDeg, wheelPoint, type Polyline, type Pt, type Trip } from './diorama-motion';

const S = scene.sprites;
export const center = (b: SpriteBox): Pt => [b.x + b.w / 2, b.y + b.h / 2];

/** 透視：畫面越上面越遠、越小（y 每往上 100px 縮約 2 成）。 */
const persp = (y: number, k: number) => Math.min(1.25, Math.max(0.45, 1 + (y - 500) * k));

// 火車：車頭車尾貼著鐵軌（取前後兩點的弦），從左下島緣開進來、往右上開走，中間經過松樹後面。
export const trainLine = polyline(scene.train.path);
const WB = scene.train.wheelbase;
const trainS0 = nearestS(trainLine, scene.train.anchor);
const train0 = chordPose(trainLine, trainS0, WB);
export const TRAIN: Trip = { sIn: -WB / 2 - 45, sOut: trainLine.length + WB / 2 + 45, travel: 18, period: 26, s0: trainS0 };
const TRAIN_K = 0.001;

// 汽車：從島的前緣開上坡、轉彎往右，開到薩爾茲堡那頭。近處用「車尾」那張，轉進遠處那段換成遠方的模糊側面。
export const carLine = polyline(scene.car.path);
const CAR_WB = 8;
const carS0 = nearestS(carLine, scene.car.anchor);
const car0 = chordPose(carLine, carS0, CAR_WB);
const carFar0 = chordPose(carLine, nearestS(carLine, scene.car.farAnchor), CAR_WB);
export const CAR: Trip = { sIn: -30, sOut: carLine.length + 30, travel: 14, period: 21, s0: carS0 };
const CAR_K = 0.0021;
// 車尾那張轉超過 15° 就開始淡出、30° 完全換成遠方那張
const carTurn = (s: number) => Math.abs(chordPose(carLine, s, CAR_WB).deg - car0.deg);
const sAt = (deg: number) => { for (let s = carS0; s < carLine.length; s += 1) if (carTurn(s) >= deg) return s; return carLine.length; };
const FADE_A = sAt(15), FADE_B = sAt(30);
const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a || 1))); return u * u * (3 - 2 * u); };

type Rest = { x: number; y: number; deg: number };
function along(line: Polyline, s: number, wb: number, rest: Rest, k: number): string {
  const p = chordPose(line, s, wb), sc = persp(p.y, k) / persp(rest.y, k);
  return `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${(p.deg - rest.deg).toFixed(2)}) scale(${sc.toFixed(3)}) translate(${(-rest.x).toFixed(2)} ${(-rest.y).toFixed(2)})`;
}

function stroll(t: number, b: SpriteBox, w: { amp: number; period: number }): string {
  const o = strollOffset(t, w.amp, w.period), cx = b.x + b.w / 2;
  return `translate(${o.dx.toFixed(2)} ${o.dy.toFixed(2)})${o.flip ? ` translate(${cx.toFixed(2)} 0) scale(-1 1) translate(${(-cx).toFixed(2)} 0)` : ''}`;
}

export const CABINS = 15;
const W = scene.wheel;
export function cabinAt(k: number, deg: number): string {
  const [x, y] = wheelPoint(W.center, W.rx, W.ry, W.rotDeg, (deg * Math.PI) / 180 + (2 * Math.PI * k) / CABINS, 1.03);
  return `translate(${x.toFixed(2)} ${y.toFixed(2)})`;
}

export interface Poses {
  /** null = 在畫面外等下一趟 */
  train: string | null;
  car: { near: string; far: string; fade: number } | null;
  boat: string;
  couple: string;
  men: string;
  wheel: string;
  cabins: string[];
}

export function posesAt(t: number): Poses {
  const ts = tripS(t, TRAIN), cs = tripS(t, CAR);
  const b = boatOffset(t, scene.boat.axis, scene.boat.amp), [bx, by] = center(S.boat);
  const deg = wheelDeg(t);
  return {
    train: ts === null ? null : along(trainLine, ts, WB, train0, TRAIN_K),
    car: cs === null ? null : { near: along(carLine, cs, CAR_WB, car0, CAR_K), far: along(carLine, cs, CAR_WB, carFar0, CAR_K), fade: smooth(FADE_A, FADE_B, cs) },
    boat: `translate(${b.dx.toFixed(2)} ${b.dy.toFixed(2)}) rotate(${b.deg.toFixed(2)} ${bx.toFixed(2)} ${by.toFixed(2)})`,
    couple: stroll(t, S.couple, scene.walkers.couple),
    men: stroll(t + 3, S.men, scene.walkers.men),
    wheel: `rotate(${deg.toFixed(3)})`,
    cabins: Array.from({ length: CABINS }, (_, k) => cabinAt(k, deg)),
  };
}
