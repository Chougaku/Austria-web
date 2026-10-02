import { CITIES, type CityInfo, type CityKey } from '../data/areas';
import type { LegMode, Stay } from '../data/schema';
import { euroDate, routeSegments, shortDate, stayOfCity } from '../lib/trip';

/**
 * 總覽頁的主視覺：一張手繪感的路線圖。桌機是有河流、湖泊、國界、山的地圖版；
 * 手機換成蛇形版（前半站一列、後半站倒著一列），字才看得清楚。兩版共用同一套郵戳——
 * 外圈城市名與國名、中間入住日期與晚數，資料來自總覽.md 的住宿與移動。
 *
 * 地圖版的投影：等距圓柱、經度乘上 cos(47.7°)，把六座城市攤在 1600×900 畫布的下半部，
 * 上半部留給釘在圖上的旅券卡與摘要卡。地理線條（河、湖、國界）是概略描線，只求認得出來。
 */

const LNG0 = 11.3932;
const LAT0 = 48.2085;
const KY = 340;
const KX = KY * Math.cos((47.7 * Math.PI) / 180);
const px = (lng: number, lat: number): [number, number] =>
  [230 + (lng - LNG0) * KX, 390 + (LAT0 - lat) * KY];
const pathOf = (pts: [number, number][]) =>
  pts.map(([lng, lat], i) => {
    const [x, y] = px(lng, lat);
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

const RIVERS: [number, number][][] = [
  // 多瑙河：帕紹 → 林茲 → 瓦豪河谷 → 維也納
  [[12.95, 48.70], [13.46, 48.57], [13.80, 48.48], [14.29, 48.31], [14.52, 48.24], [14.86, 48.22],
    [15.08, 48.17], [15.33, 48.23], [15.60, 48.41], [16.05, 48.33], [16.32, 48.31], [16.42, 48.22],
    [16.60, 48.15], [17.10, 48.14]],
  // 茵河：因斯布魯克 → 庫夫斯坦 → 羅森海姆 → 帕紹
  [[10.57, 47.14], [11.07, 47.31], [11.39, 47.27], [11.51, 47.28], [11.71, 47.35], [12.06, 47.49],
    [12.17, 47.58], [12.13, 47.86], [12.23, 48.06], [12.52, 48.25], [13.03, 48.26], [13.43, 48.46],
    [13.46, 48.57]],
  // 薩爾察赫河：經薩爾茲堡北流入茵河
  [[12.48, 47.28], [12.80, 47.30], [13.15, 47.32], [13.22, 47.42], [13.17, 47.60], [13.10, 47.68],
    [13.05, 47.80], [12.93, 47.94], [12.77, 48.06], [12.83, 48.16], [12.90, 48.20]],
  // 伊薩爾河：穿過慕尼黑
  [[11.26, 47.44], [11.56, 47.76], [11.58, 48.14], [11.75, 48.40], [11.95, 48.55]],
  // 穆爾河：穿過格拉茨
  [[14.00, 47.12], [14.66, 47.17], [15.09, 47.38], [15.27, 47.41], [15.43, 47.07], [15.60, 46.78]],
];

/** 湖：中心經緯度、半徑（畫布單位）、旋轉角。鹽湖區那一團就是住 Bad Ischl 的理由。 */
const LAKES: [number, number, number, number, number][] = [
  [13.45, 47.745, 17, 5, -12], // 沃夫岡湖
  [13.655, 47.575, 4, 12, 0], // 哈修塔特湖
  [13.795, 47.87, 5, 17, 5], // 特勞恩湖
  [13.545, 47.87, 6, 27, 10], // 阿特湖
  [13.36, 47.83, 13, 4.5, -25], // 月亮湖
  [12.45, 47.87, 17, 13, 0], // 基姆湖
  [12.98, 47.555, 3, 11, 8], // 國王湖
  [11.32, 47.91, 6, 22, 0], // 施塔恩貝格湖
  [11.13, 48.0, 6, 17, 0], // 阿默湖
  [11.71, 47.46, 3, 10, 10], // 阿亨湖
];

/** 德奧國界（概略）：從新天鵝堡一帶沿阿爾卑斯北緣往東，繞過貝希特斯加登，再沿薩爾察赫河與茵河北上。 */
const BORDER: [number, number][] = [
  [10.75, 47.55], [10.985, 47.42], [11.26, 47.40], [11.45, 47.47], [11.65, 47.59], [11.90, 47.63],
  [12.19, 47.62], [12.42, 47.67], [12.68, 47.66], [12.80, 47.60], [12.88, 47.50], [12.99, 47.47],
  [13.08, 47.56], [13.04, 47.70], [12.97, 47.80], [12.93, 47.93], [12.86, 48.06], [12.83, 48.17],
  [12.95, 48.23], [13.03, 48.26], [13.25, 48.30], [13.43, 48.46], [13.46, 48.57], [13.84, 48.77],
];

/** 山：畫布座標的稜線（峰、谷交錯），只畫在路線南邊。 */
const RANGES: { base: number; pts: [number, number][] }[] = [
  { base: 830, pts: [[40, 830], [82, 772], [118, 790], [158, 748], [196, 784], [238, 742], [278, 778], [322, 750], [362, 786], [404, 756], [446, 788], [492, 762], [540, 830]] },
  { base: 812, pts: [[478, 812], [522, 750], [560, 772], [612, 730], [656, 760], [704, 724], [748, 758], [796, 736], [846, 770], [896, 812]] },
  { base: 772, pts: [[918, 772], [952, 718], [988, 742], [1030, 706], [1068, 734], [1108, 772]] },
];

/** 相鄰兩城之間路線的彎法（二次貝茲控制點）與標籤位置，照實際路線的大方向手調：
    維也納 → 格拉茨往東南繞、薩爾茲堡 → 因斯布魯克往北繞進德國（Deutsches Eck）。 */
const CURVES: Record<string, { c: [number, number]; tag: [number, number]; anchor: 'start' | 'middle' | 'end' }> = {
  'wien>graz': { c: [1455, 560], tag: [1386, 580], anchor: 'start' },
  'graz>ischl': { c: [930, 560], tag: [948, 650], anchor: 'middle' },
  'ischl>salzburg': { c: [675, 530], tag: [648, 618], anchor: 'end' },
  'salzburg>innsbruck': { c: [400, 470], tag: [462, 492], anchor: 'middle' },
  'innsbruck>muenchen': { c: [150, 560], tag: [184, 566], anchor: 'end' },
};

/** 中文城名放在郵戳的哪一側（畫布偏移）。 */
const LABEL_AT: Record<CityKey, { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' }> = {
  wien: { dx: 0, dy: -70, anchor: 'middle' },
  graz: { dx: 0, dy: 92, anchor: 'middle' },
  ischl: { dx: 0, dy: 90, anchor: 'middle' },
  salzburg: { dx: 0, dy: -70, anchor: 'middle' },
  innsbruck: { dx: 66, dy: 10, anchor: 'start' },
  muenchen: { dx: 66, dy: 10, anchor: 'start' },
};

const TILT = [-8, 6, -5, 7, -6, 5];

/** 飛機符號加 U+FE0E 強制文字樣式，否則部分系統會換成彩色 emoji、吃不到 fill。 */
const PLANE = '✈︎';

const TAG_WORD: Record<LegMode, string> = {
  flight: '飛機', drive: '自駕', train: '火車', bus: '巴士', ferry: '渡輪', other: '移動',
};

function Postmark({ city, stay, x, y, r, tilt, id }: {
  city: CityInfo; stay?: Stay; x: number; y: number; r: number; tilt: number; id: string;
}) {
  const top = r - r * 0.19;
  const bottom = r - r * 0.06;
  return (
    <g transform={`rotate(${tilt} ${x} ${y})`}>
      <circle className="rh-pm-ring" cx={x} cy={y} r={r} />
      <circle className="rh-pm-inner" cx={x} cy={y} r={r * 0.76} />
      <path id={`${id}-t`} d={`M${x - top},${y} A${top},${top} 0 0 1 ${x + top},${y}`} fill="none" />
      <path id={`${id}-b`} d={`M${x - bottom},${y} A${bottom},${bottom} 0 0 0 ${x + bottom},${y}`} fill="none" />
      <text className="rh-pm-text">
        <textPath href={`#${id}-t`} startOffset="50%" textAnchor="middle">{city.stamp}</textPath>
      </text>
      <text className="rh-pm-text">
        <textPath href={`#${id}-b`} startOffset="50%" textAnchor="middle">
          {city.country === 'AT' ? 'ÖSTERREICH' : 'DEUTSCHLAND'}
        </textPath>
      </text>
      <circle cx={x - r * 0.88} cy={y} r={r * 0.045} fill="var(--navy)" />
      <circle cx={x + r * 0.88} cy={y} r={r * 0.045} fill="var(--navy)" />
      {stay ? (
        <>
          <text className="rh-pm-date" x={x} y={y + r * 0.08} textAnchor="middle">{euroDate(stay.checkIn)}</text>
          <text className="rh-pm-nights" x={x} y={y + r * 0.42} textAnchor="middle">{stay.nights} 晚</text>
        </>
      ) : (
        <text className="rh-pm-date" x={x} y={y + r * 0.15} textAnchor="middle">—</text>
      )}
    </g>
  );
}

function MapVariant() {
  const pos = new Map(CITIES.map((c) => [c.key, px(c.lng, c.lat)]));
  const segs = routeSegments();
  const R = 54;
  const graticuleX = [11, 12, 13, 14, 15, 16, 17].map((lng) => px(lng, LAT0)[0]);
  const graticuleY = [48.5, 48, 47.5, 47].map((lat) => px(LNG0, lat)[1]);
  const [wx, wy] = pos.get('wien')!;
  const [mx, my] = pos.get('muenchen')!;

  return (
    <svg className="route-hero route-hero--map" viewBox="0 0 1600 900" role="img"
      aria-label={`路線圖：${CITIES.map((c) => c.name).join(' → ')}`}>
      <rect className="rh-sheet" x="6" y="6" width="1588" height="888" rx="18" />
      {graticuleX.map((x) => <line key={`gx${x}`} className="rh-grid" x1={x} y1="20" x2={x} y2="880" />)}
      {graticuleY.map((y) => <line key={`gy${y}`} className="rh-grid" x1="20" y1={y} x2="1580" y2={y} />)}

      {RANGES.map((r, i) => (
        <g key={i}>
          <polygon className="rh-mountain" points={r.pts.map((p) => p.join(',')).join(' ')} />
          {r.pts.slice(1, -1).filter((_, j) => j % 2 === 0).map(([x, y]) => (
            <polygon key={x} className="rh-snow" points={`${x - 9},${y + 11} ${x},${y} ${x + 9},${y + 11} ${x + 4},${y + 8} ${x},${y + 12} ${x - 4},${y + 8}`} />
          ))}
        </g>
      ))}
      {RIVERS.map((r, i) => <path key={i} className="rh-river" d={pathOf(r)} />)}
      {LAKES.map(([lng, lat, rx, ry, rot]) => {
        const [x, y] = px(lng, lat);
        return <ellipse key={`${lng}`} className="rh-lake" cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${rot} ${x} ${y})`} />;
      })}
      <path className="rh-border" d={pathOf(BORDER)} />
      <text className="rh-country" x="455" y="398">DEUTSCHLAND</text>
      <text className="rh-country" x="1000" y="862" textAnchor="middle">ÖSTERREICH</text>

      {/* 標題與指北針：放在兩張釘住的卡片中間 */}
      <text className="rh-small" x="835" y="78" textAnchor="middle">REISEROUTE · {CITIES.length} STÄDTE</text>
      <text x="835" y="132" textAnchor="middle" style={{ font: 'italic 700 42px var(--serif)', fill: 'var(--ink)' }}>
        Wien → München
      </text>
      <g transform="translate(835 214)">
        <circle r="24" fill="none" stroke="var(--brown-lt)" strokeWidth="1.2" />
        <polygon points="0,-20 6,0 0,20 -6,0" fill="var(--brown-lt)" opacity=".35" />
        <polygon points="0,-20 6,0 -6,0" fill="var(--brown-dk)" />
        <text className="rh-small" y="-30" textAnchor="middle">N</text>
      </g>

      {/* 飛機：抵達維也納、從慕尼黑回程 */}
      <path className="rh-route rh-route--flight" d={`M1580,292 Q1490,300 ${wx + 44},${wy - 30}`} />
      <text x="1548" y="290" fontSize="26" fill="var(--brown-dk)">{PLANE}</text>
      <path className="rh-route rh-route--flight" d={`M${mx - 44},${my - 24} Q140,330 46,352`} />
      <text transform="translate(48 362) scale(-1 1)" fontSize="26" fill="var(--brown-dk)">{PLANE}</text>

      {segs.map((s) => {
        const key = `${s.from.key}>${s.to.key}`;
        const curve = CURVES[key];
        const [x1, y1] = pos.get(s.from.key)!;
        const [x2, y2] = pos.get(s.to.key)!;
        const c = curve?.c ?? [(x1 + x2) / 2, (y1 + y2) / 2];
        const mode = s.leg?.mode ?? 'other';
        return (
          <g key={key}>
            <path className={`rh-route rh-route--${mode}`} d={`M${x1},${y1} Q${c[0]},${c[1]} ${x2},${y2}`} />
            {curve && s.leg && (
              <text className={`rh-route-tag rh-route-tag--${mode}`} x={curve.tag[0]} y={curve.tag[1]} textAnchor={curve.anchor}>
                {TAG_WORD[mode]} {shortDate(s.leg.date)}{key === 'salzburg>innsbruck' && mode === 'drive' ? '・經德國' : ''}
              </text>
            )}
          </g>
        );
      })}

      {CITIES.map((c, i) => {
        const [x, y] = pos.get(c.key)!;
        const at = LABEL_AT[c.key];
        return (
          <g key={c.key}>
            <Postmark id={`rhm-${c.key}`} city={c} stay={stayOfCity(c.key)} x={x} y={y} r={R} tilt={TILT[i % TILT.length]} />
            <text className="rh-label" x={x + at.dx} y={y + at.dy} textAnchor={at.anchor}>{c.name}</text>
          </g>
        );
      })}

      {/* 圖例與比例尺 */}
      <g transform="translate(44 868)">
        <line x1="0" y1="-6" x2="40" y2="-6" className="rh-route rh-route--drive" />
        <text className="rh-legend" x="50" y="0">自駕</text>
        <line x1="112" y1="-6" x2="152" y2="-6" className="rh-route rh-route--train" />
        <text className="rh-legend" x="162" y="0">火車</text>
        <line x1="224" y1="-6" x2="264" y2="-6" className="rh-route rh-route--flight" />
        <text className="rh-legend" x="274" y="0">飛機</text>
      </g>
      <g transform="translate(1392 862)">
        <line x1="0" y1="0" x2="153" y2="0" stroke="var(--brown-dk)" strokeWidth="2" />
        <line x1="0" y1="-7" x2="0" y2="7" stroke="var(--brown-dk)" strokeWidth="2" />
        <line x1="76" y1="-5" x2="76" y2="5" stroke="var(--brown-dk)" strokeWidth="1.5" />
        <line x1="153" y1="-7" x2="153" y2="7" stroke="var(--brown-dk)" strokeWidth="2" />
        <text className="rh-small" x="0" y="-14" textAnchor="middle">0</text>
        <text className="rh-small" x="153" y="-14" textAnchor="middle">50 km</text>
      </g>
    </svg>
  );
}

function SnakeVariant() {
  const n = CITIES.length;
  const firstRow = Math.ceil(n / 2);
  const W = 360;
  const R = 34;
  const rowY = [76, 198];
  const xs = (count: number) => Array.from({ length: count }, (_, i) => 56 + (i * (W - 112)) / Math.max(1, count - 1));
  const row1 = xs(firstRow);
  const row2 = xs(n - firstRow).reverse();
  const pos = new Map(CITIES.map((c, i) => [c.key, (i < firstRow
    ? [row1[i], rowY[0]]
    : [row2[i - firstRow], rowY[1]]) as [number, number]]));
  const segs = routeSegments();

  return (
    <svg className="route-hero route-hero--snake" viewBox={`0 0 ${W} 268`} role="img"
      aria-label={`路線：${CITIES.map((c) => c.name).join(' → ')}`}>
      <rect className="rh-sheet" x="2" y="2" width={W - 4} height="264" rx="12" />
      {segs.map((s, i) => {
        const [x1, y1] = pos.get(s.from.key)!;
        const [x2, y2] = pos.get(s.to.key)!;
        const turn = i === firstRow - 1;
        const d = turn
          ? `M${x1},${y1} C${x1 + 50},${y1 + 34} ${x2 + 50},${y2 - 34} ${x2},${y2}`
          : `M${x1},${y1} L${x2},${y2}`;
        const mode = s.leg?.mode ?? 'other';
        const tx = turn ? x1 - 4 : (x1 + x2) / 2;
        const ty = turn ? (y1 + y2) / 2 + 4 : y1 - 10;
        return (
          <g key={i}>
            <path className={`rh-route rh-route--${mode}`} d={d} />
            {s.leg && (
              <text className={`rh-route-tag rh-route-tag--${mode}`} x={tx} y={ty} textAnchor={turn ? 'end' : 'middle'}>
                {TAG_WORD[mode]} {shortDate(s.leg.date)}
              </text>
            )}
          </g>
        );
      })}
      <text x="5" y="81" fontSize="14" fill="var(--brown-dk)">{PLANE}</text>
      <text transform="translate(20 203) scale(-1 1)" fontSize="14" fill="var(--brown-dk)">{PLANE}</text>
      {CITIES.map((c, i) => {
        const [x, y] = pos.get(c.key)!;
        return (
          <g key={c.key}>
            <Postmark id={`rhs-${c.key}`} city={c} stay={stayOfCity(c.key)} x={x} y={y} r={R} tilt={TILT[i % TILT.length]} />
            <text className="rh-label" x={x} y={y + R + 18} textAnchor="middle">{c.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function RouteHero() {
  return (
    <div className="route-hero-wrap">
      <MapVariant />
      <SnakeVariant />
    </div>
  );
}
