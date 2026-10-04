// 用另一張圖補洞：Gemini 移除物件的乾淨版（自動找位移對齊），或同一張圖別處的同材質（指定位移）。
// 只在物件外框附近的小視窗裡運算，大圖也快。
//   out   ：要被補的 RGBA（原圖座標）
//   orig  ：原圖 RGBA（拿洞外圈來對齊、算色差）
//   src   ：材質來源 RGBA（同尺寸）
//   mask  ：物件遮罩 Uint8Array(W*H)
//   box   ：物件外框 [x0,y0,x1,y1]
const at = (buf, W, x, y) => { const i = (y * W + x) * 4; return [buf[i], buf[i + 1], buf[i + 2]]; };

// 物件外框附近的視窗：距離場 d（離遮罩幾 px）與外圈 ring（離物件 8~18px，用來對齊與算色差）
function around({ W, H, mask, box }) {
  const M = 32;
  const x0 = Math.max(0, box[0] - M), y0 = Math.max(0, box[1] - M);
  const x1 = Math.min(W - 1, box[2] + M), y1 = Math.min(H - 1, box[3] + M);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;

  // chamfer 3-4 近似歐氏距離 ×3
  const INF = 1e9, d = new Float64Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d[y * w + x] = mask[(y + y0) * W + (x + x0)] ? 0 : INF;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 3);
    if (y > 0) { v = Math.min(v, d[i - w] + 3); if (x > 0) v = Math.min(v, d[i - w - 1] + 4); if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4); }
    d[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; let v = d[i];
    if (x < w - 1) v = Math.min(v, d[i + 1] + 3);
    if (y < h - 1) { v = Math.min(v, d[i + w] + 3); if (x < w - 1) v = Math.min(v, d[i + w + 1] + 4); if (x > 0) v = Math.min(v, d[i + w - 1] + 4); }
    d[i] = v;
  }
  for (let i = 0; i < w * h; i++) d[i] /= 3;

  const ring = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = d[y * w + x]; if (v >= 8 && v <= 18) ring.push([x + x0, y + y0]); }
  return { x0, y0, w, h, d, ring };
}

// src 要位移多少才對得上原圖：外圈色差平方和最小的那個
function bestOffset({ orig, src, W, H, ring, search }) {
  let best = Infinity, dx = 0, dy = 0;
  for (let sy = -search; sy <= search; sy++) for (let sx = -search; sx <= search; sx++) {
    let ssd = 0, n = 0;
    for (let k = 0; k < ring.length; k += 2) {
      const [x, y] = ring[k], xx = x + sx, yy = y + sy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const a = at(orig, W, x, y), b = at(src, W, xx, yy);
      ssd += (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2; n++;
    }
    const score = ssd / Math.max(1, n);
    if (score < best) { best = score; dx = sx; dy = sy; }
  }
  return [dx, dy];
}

function alignOffset({ orig, src, W, H, mask, box, search }) {
  return bestOffset({ orig, src, W, H, ring: around({ W, H, mask, box }).ring, search });
}

function patchRegion({ out, orig, src, W, H, mask, box, offset = null, search = 0, grow = 3, feather = 4, colorFix = true }) {
  const { x0, y0, w, h, d, ring } = around({ W, H, mask, box });
  const [dx, dy] = search > 0 ? bestOffset({ orig, src, W, H, ring, search }) : offset ?? [0, 0];

  // 色差：外圈平均色對齊
  let corr = [0, 0, 0];
  if (colorFix && ring.length) {
    const s = [0, 0, 0, 0, 0, 0]; let n = 0;
    for (const [x, y] of ring) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const a = at(orig, W, x, y), b = at(src, W, xx, yy);
      for (let c = 0; c < 3; c++) { s[c] += a[c]; s[c + 3] += b[c]; } n++;
    }
    corr = [0, 1, 2].map((c) => (s[c] - s[c + 3]) / Math.max(1, n));
  }

  // 貼上：洞內全不透明，外面 feather px 漸淡
  let painted = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = d[y * w + x];
    if (v > grow + feather) continue;
    const a = v <= grow ? 1 : 1 - (v - grow) / feather;
    const X = x + x0, Y = y + y0, xx = X + dx, yy = Y + dy;
    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
    const b = at(src, W, xx, yy), i = (Y * W + X) * 4;
    for (let c = 0; c < 3; c++) out[i + c] = Math.round(Math.min(255, Math.max(0, b[c] + corr[c])) * a + out[i + c] * (1 - a));
    painted++;
  }
  return { dx, dy, corr: corr.map((c) => +c.toFixed(1)), painted };
}

module.exports = { patchRegion, alignOffset };
