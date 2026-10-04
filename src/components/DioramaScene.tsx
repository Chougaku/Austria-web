import { useEffect, useRef } from 'react';
import { diorama as scene, type SpriteBox as Box } from '../data/diorama';
import { polyline } from '../lib/diorama-motion';
import { CABINS, cabinAt, carLine, posesAt, trainLine } from '../lib/diorama-poses';

// 首頁的立體地景：底圖是把會動的東西挖掉、補好背景的 webp，上面疊一層 SVG——
// 火車與汽車沿路徑跑、小船漂、人散步、摩天輪轉（輪子用向量重畫，車廂轉的時候保持水平）。
// 每個時間點的位置在 lib/diorama-poses.ts；素材與幾何由 scripts/diorama/build.cjs 產生，見 DESIGN.md「立體地景」。

const BASE = import.meta.env.BASE_URL;
const asset = (f: string) => `${BASE}${f}`;
const SRC = asset('diorama-1600.webp');
const SRC_SM = asset('diorama-900.webp');
const [VW, VH] = scene.size;
const ALT = '奧地利與巴伐利亞微縮立體地景：慕尼黑聖母教堂、因斯布魯克黃金屋頂、薩爾茲堡要塞、哈修塔特湖畔、格拉茨鐘塔、維也納史蒂芬大教堂與摩天輪';

const S = scene.sprites;
const O = scene.occluders;

/** 路徑兩端外側裁掉：車子像從隧道口出來、開進去。 */
function corridor(line: ReturnType<typeof polyline>): string {
  const end = (s: number, d: number) => { const a = line.at(s), b = line.at(s + d); const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return { p: a, n: [-(b[1] - a[1]) / l, (b[0] - a[0]) / l] }; };
  const A = end(0, 2), B = end(line.length, -2), K = 900;
  // B 的法向量是反向切線取的，跟 A 方向相反，補回同一側
  const pts = [
    [A.p[0] + A.n[0] * K, A.p[1] + A.n[1] * K], [B.p[0] - B.n[0] * K, B.p[1] - B.n[1] * K],
    [B.p[0] + B.n[0] * K, B.p[1] + B.n[1] * K], [A.p[0] - A.n[0] * K, A.p[1] - A.n[1] * K],
  ];
  return pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
}

const WHEEL = scene.wheel;
const WC = WHEEL.center;
const RIM_TICKS = Array.from({ length: 60 }, (_, i) => (i * 2 * Math.PI) / 60);
const SPOKES = Array.from({ length: 36 }, (_, i) => (i * 2 * Math.PI) / 36);

/** 輪框與輻條（單位圓座標，外層再縮放成橢圓）。 */
function Rim({ spin }: { spin: (el: SVGGElement | null) => void }) {
  return (
    <g ref={spin}>
      {SPOKES.map((a) => (
        <line key={a} x1="0" y1="0" x2={0.93 * Math.cos(a)} y2={0.93 * Math.sin(a)} className="dio-spoke" />
      ))}
      <circle r="1" className="dio-rim" />
      <circle r="0.93" className="dio-rim dio-rim--in" />
      {RIM_TICKS.map((a) => (
        <line key={a} x1={0.93 * Math.cos(a)} y1={0.93 * Math.sin(a)} x2={Math.cos(a)} y2={Math.sin(a)} className="dio-tick" />
      ))}
      <circle r="0.045" className="dio-hub" />
    </g>
  );
}

export default function DioramaScene() {
  const root = useRef<HTMLDivElement>(null);
  const train = useRef<SVGGElement>(null);
  const car = useRef<SVGGElement>(null);
  const carFar = useRef<SVGGElement>(null);
  const boat = useRef<SVGGElement>(null);
  const couple = useRef<SVGGElement>(null);
  const men = useRef<SVGGElement>(null);
  const spins = useRef<(SVGGElement | null)[]>([]);
  const cabins = useRef<(SVGGElement | null)[]>([]);

  useEffect(() => {
    const move = (el: SVGGElement | null, transform: string | null, opacity = 1) => {
      if (!el) return;
      if (transform === null || opacity <= 0.001) { el.style.display = 'none'; return; }
      el.style.display = '';
      el.setAttribute('transform', transform);
      el.style.opacity = opacity < 0.999 ? opacity.toFixed(3) : '';
    };
    const apply = (t: number) => {
      const p = posesAt(t);
      move(train.current, p.train);
      move(car.current, p.car && p.car.near, p.car ? 1 - p.car.fade : 1);
      move(carFar.current, p.car && p.car.far, p.car ? p.car.fade : 0);
      move(boat.current, p.boat);
      move(couple.current, p.couple);
      move(men.current, p.men);
      for (const el of spins.current) el?.setAttribute('transform', p.wheel);
      cabins.current.forEach((el, k) => el?.setAttribute('transform', p.cabins[k]));
    };

    apply(0);
    // 開發時可在主控台 __dioramaSeek(秒) 直接跳到某個時間點檢查位置（正式版不會有）
    let manual = false;
    if (import.meta.env.DEV) (window as unknown as { __dioramaSeek?: (t: number) => void }).__dioramaSeek = (t) => { manual = true; apply(t); };
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduce || typeof requestAnimationFrame !== 'function') return;

    // 只在看得到時跑；約 30fps 就夠順（東西都動得很慢），手機省電。
    let raf = 0, t = 0, last = 0, drawn = 0, running = false;
    const loop = (now: number) => {
      if (last) t += Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!manual && now - drawn > 32) { apply(t); drawn = now; }
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(loop); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined' && root.current) {
      io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
      io.observe(root.current);
    } else start();
    return () => { stop(); io?.disconnect(); };
  }, []);

  const img = (b: Box) => <image href={asset(b.file)} x={b.x} y={b.y} width={b.w} height={b.h} />;

  return (
    <div ref={root} className="ov-diorama">
      {/* 不用 <picture>／<source>：媒體查詢命中後會整個蓋掉 srcSet，高密度手機就拿不到 1600w */}
      <img
        src={SRC}
        srcSet={`${SRC_SM} 900w, ${SRC} 1600w`}
        sizes="(max-width: 1000px) 96vw, 1080px"
        width={VW}
        height={VH}
        alt={ALT}
        fetchPriority="high"
        decoding="async"
      />
      <svg className="ov-diorama-fx" viewBox={`0 0 ${VW} ${VH}`} aria-hidden="true">
        <defs>
          <clipPath id="dio-train-clip"><polygon points={corridor(trainLine)} /></clipPath>
          <clipPath id="dio-car-clip"><polygon points={corridor(carLine)} /></clipPath>
          {/* 史蒂芬大教堂的塔在摩天輪前面：輪子只畫在塔的右側 */}
          <clipPath id="dio-wheel-clip"><rect x={WHEEL.clipX} y="0" width={VW - WHEEL.clipX} height={WHEEL.ground} /></clipPath>
        </defs>

        <g ref={boat}>{img(S.boat)}</g>
        <g clipPath="url(#dio-car-clip)">
          <g ref={car}>{img(S.car)}</g>
          <g ref={carFar} style={{ display: 'none' }}>{img(S.carFar)}</g>
        </g>
        <g ref={couple}>{img(S.couple)}</g>
        <g ref={men}>{img(S.men)}</g>
        {scene.train.moves && (
          <>
            <g clipPath="url(#dio-train-clip)"><g ref={train}>{img(S.train)}</g></g>
            {img(O.pines)}
          </>
        )}

        <g clipPath="url(#dio-wheel-clip)">
          <g transform={`translate(${WC[0] + WHEEL.back[0]} ${WC[1] + WHEEL.back[1]}) rotate(${WHEEL.rotDeg}) scale(${WHEEL.rx} ${WHEEL.ry})`} className="dio-wheel-back">
            <Rim spin={(el) => { spins.current[0] = el; }} />
          </g>
          <g transform={`translate(${WC[0]} ${WC[1]}) rotate(${WHEEL.rotDeg}) scale(${WHEEL.rx} ${WHEEL.ry})`}>
            <Rim spin={(el) => { spins.current[1] = el; }} />
          </g>
          {Array.from({ length: CABINS }, (_, k) => (
            <g key={k} ref={(el) => { cabins.current[k] = el; }} transform={cabinAt(k, 0)}>
              <line x1="0" y1="-1" x2="0" y2="1.6" className="dio-hanger" />
              <rect x="-7" y="1.6" width="14" height="8.4" rx="1.3" className="dio-cabin" />
              <rect x="-7" y="1.6" width="14" height="3.6" rx="1.3" className="dio-cabin-top" />
              <rect x="-5.6" y="2.5" width="11.2" height="1.9" className="dio-cabin-win" />
            </g>
          ))}
          {WHEEL.legs.map(([a, b], i) => (
            <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="dio-leg" />
          ))}
        </g>
        {img(O.wheelTree)}
      </svg>
    </div>
  );
}
