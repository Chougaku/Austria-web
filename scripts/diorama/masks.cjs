// 會動物件的遮罩（Gemini 原圖座標，2528×1696，換圖要重量）。每個 mask() 回傳 Uint8Array(W*H)，1 = 物件。
const W = 2528, H = 1696;

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function polyMask(poly) {
  const m = new Uint8Array(W * H);
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++)
      if (pointInPoly(x + 0.5, y + 0.5, poly)) m[y * W + x] = 1;
  return m;
}

function boxMask(data, [x0, y0, x1, y1], test) {
  const m = new Uint8Array(W * H);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * W + x) * 4;
    if (test(data[i], data[i + 1], data[i + 2], x, y)) m[y * W + x] = 1;
  }
  return m;
}

// 只留跟種子點連通的部分（去掉框內零星的花、石頭）。
function keepConnected(m, seeds) {
  const out = new Uint8Array(W * H);
  const st = [];
  for (const [x, y] of seeds) if (m[y * W + x]) st.push(y * W + x);
  while (st.length) {
    const i = st.pop();
    if (out[i] || !m[i]) continue;
    out[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1);
    if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W);
  }
  return out;
}

function dilate(m, r) {
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!m[y * W + x]) continue;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) out[yy * W + xx] = 1;
    }
  }
  return out;
}

function close(m, r) { return erode(dilate(m, r), r); }
function erode(m, r) {
  const inv = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) inv[i] = m[i] ? 0 : 1;
  const d = dilate(inv, r);
  const out = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) out[i] = d[i] ? 0 : 1;
  return out;
}

function union(...ms) {
  const out = new Uint8Array(W * H);
  for (const m of ms) for (let i = 0; i < W * H; i++) if (m[i]) out[i] = 1;
  return out;
}

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

// 物件定義：box 是原圖座標的外框
const OBJECTS = {
  // 火車：沿車身輪廓的多邊形（車頭在左下、車尾在右上）
  train: {
    box: [758, 800, 996, 950],
    mask: () => polyMask([
      [761, 904], [767, 900], [960, 801], [992, 809], [994, 834], [990, 845],
      [795, 949], [766, 945], [760, 932],
    ]),
  },
  car: {
    box: [1098, 940, 1154, 985],
    // 車身：紅色、深色車窗輪胎；影子另外算（路面變暗的部分）
    mask: (d) => keepConnected(close(boxMask(d, [1108, 942, 1153, 980], (r, g, b) =>
      (r > 120 && r > g + 50 && r > b + 50) || lum(r, g, b) < 70 || (b > r + 10 && lum(r, g, b) < 140)), 1), [[1130, 960]]),
  },
  // 上坡路上第二台紅車：跟會動的汽車同車道，直接擦掉
  car2: {
    box: [1380, 694, 1424, 726],
    mask: (d) => keepConnected(close(boxMask(d, [1380, 694, 1424, 726], (r, g, b) =>
      (r > 120 && r > g + 45 && r > b + 45) || lum(r, g, b) < 78), 2), [[1404, 710], [1395, 712]]),
  },
  boat: {
    box: [1462, 1010, 1588, 1078],
    mask: (d) => keepConnected(close(boxMask(d, [1462, 1010, 1588, 1078], (r, g, b) => !(g > r + 35 && b > r + 25)), 2), [[1520, 1050], [1500, 1035], [1560, 1045]]),
  },
  couple: {
    box: [1112, 1032, 1168, 1098],
    mask: (d) => keepConnected(close(boxMask(d, [1112, 1032, 1168, 1098], (r, g, b) => !(g > b + 28 && g >= r - 8)), 1), [[1128, 1075], [1153, 1060], [1128, 1055], [1153, 1045]]),
  },
  men: {
    box: [1930, 945, 1982, 994],
    mask: (d) => keepConnected(close(boxMask(d, [1930, 945, 1982, 994], (r, g, b) => {
      const L = lum(r, g, b), sat = Math.max(r, g, b) - Math.min(r, g, b);
      return L > 228 || L < 140 || sat > 45;
    }), 1), [[1956, 975], [1970, 975], [1956, 960], [1970, 960]]),
  },
};

module.exports = { W, H, OBJECTS, polyMask, boxMask, keepConnected, dilate, erode, close, union, lum, pointInPoly };
