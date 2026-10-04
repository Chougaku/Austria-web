// 會動的立體地景：從 Gemini 生成的原圖產生
//   - public/diorama-1600.webp、diorama-900.webp：底圖（會動的東西挖掉補背景、摩天輪擦掉，之後用 SVG 重畫）
//   - public/diorama/*.webp：火車、汽車（近／遠）、船、人；遮擋物：火車經過的松樹、摩天輪前的高樹
//   - src/data/diorama-scene.json：路徑、錨點、摩天輪幾何（網站底圖座標 1600×945）
//
// 用法（sharp、opencv 不是專案依賴，用完不留）：
//   npm i --no-save sharp @techstark/opencv-js
//   node scripts/diorama/build.cjs <原圖> [--clean=<Gemini 移除會動物件的版本>] [--force-train] [--debug]
// - 沒給 --clean：火車留在底圖上不動（橋面沒有乾淨的版本可補，自己補會糊）；--force-train 硬挖（只供開發檢查）。
// - 所有座標都是「這一張」原圖量出來的（masks.cjs 與下面第 8 段）：換圖就要重新量，見 DESIGN.md「立體地景」。
const sharp = require('sharp');
const fs = require('fs');
const os = require('os');
const path = require('path');
const M = require('./masks.cjs');

const ROOT = path.resolve(__dirname, '../..');
const outDir = path.join(ROOT, 'public');
const [input, ...flags] = process.argv.slice(2);
if (!input) { console.error('usage: node scripts/diorama/build.cjs <原圖> [--clean=<乾淨版>] [--force-train] [--debug]'); process.exit(1); }
const cleanPath = flags.find((f) => f.startsWith('--clean='))?.slice(8);
const trainMoves = !!cleanPath || flags.includes('--force-train');
const { W, H } = M;

// 原圖 → 網站底圖：裁掉透明邊，四周留 44px，縮成 1600 寬（固定框：擦掉摩天輪後不能讓裁切跟著變）。
const CROP = { left: 169, top: 240, width: 2202, height: 1265, pad: 44 };
const SCALE = 1600 / (CROP.width + 2 * CROP.pad);
const toBase = ([x, y]) => [+((x - CROP.left + CROP.pad) * SCALE).toFixed(1), +((y - CROP.top + CROP.pad) * SCALE).toFixed(1)];
const len = (v) => +(v * SCALE).toFixed(2);

// 只留 x <= maxX 的部分
function clipX(m, maxX) { const W = 2528, H = 1696; for (let y = 0; y < H; y++) for (let x = maxX + 1; x < W; x++) m[y * W + x] = 0; return m; }

// Telea 補出來的是平滑色；再從乾淨的一小塊（tile）取高頻紋理疊上去，路面顆粒、石板紋就回來了。
function addTexture(out, orig, holes, box, [tx0, ty0, tx1, ty1]) {
  const W = 2528, tw = tx1 - tx0 + 1, th = ty1 - ty0 + 1;
  const mean = [0, 0, 0];
  for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) for (let c = 0; c < 3; c++) mean[c] += orig[(y * W + x) * 4 + c];
  for (let c = 0; c < 3; c++) mean[c] /= tw * th;
  let n = 0;
  for (let y = box[1] - 6; y <= box[3] + 6; y++) for (let x = box[0] - 6; x <= box[2] + 6; x++) {
    const i = y * W + x;
    if (!holes[i]) continue;
    const tx = tx0 + (((x - tx0) % tw) + tw) % tw, ty = ty0 + (((y - ty0) % th) + th) % th;
    const j = (ty * W + tx) * 4;
    for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.max(0, Math.min(255, Math.round(out[i * 4 + c] + orig[j + c] - mean[c])));
    n++;
  }
  return { tile: [tx0, ty0, tx1, ty1], painted: n };
}

// 柏油幾乎是均勻的，拼貼小塊反而出現條紋；平滑補色再撒一點顆粒就好（固定種子，每次輸出一樣）。
function addGrain(out, holes, box, sigma) {
  const W = 2528; let seed = 7, n = 0;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
  for (let y = box[1] - 6; y <= box[3] + 6; y++) for (let x = box[0] - 6; x <= box[2] + 6; x++) {
    const i = y * W + x; if (!holes[i]) continue;
    const g = gauss() * sigma;
    for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.max(0, Math.min(255, Math.round(out[i * 4 + c] + g)));
    n++;
  }
  return { grain: sigma, painted: n };
}

function loadCv() {
  const cv = require('@techstark/opencv-js');
  // 不能 resolve(cv)：Emscripten 模組自帶 then()，Promise 會把它當 thenable 一直展開而卡死。
  return new Promise((resolve) => { if (cv.Mat) resolve({ cv }); else cv.onRuntimeInitialized = () => resolve({ cv }); });
}

(async () => {
  const { cv } = await loadCv();
  const { data } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const orig = Buffer.from(data); // 原圖，裁小圖用
  const lum = (i) => 0.299 * orig[i * 4] + 0.587 * orig[i * 4 + 1] + 0.114 * orig[i * 4 + 2];

  // ── 1. 去背：背景是米白（253,253,245），從四邊 flood fill；摩天輪輪框內、樹根間被圍住的背景另外清 ──
  const bg = [253, 253, 245];
  const near = (i, t) => Math.max(Math.abs(orig[i * 4] - bg[0]), Math.abs(orig[i * 4 + 1] - bg[1]), Math.abs(orig[i * 4 + 2] - bg[2])) <= t;
  const seen = new Uint8Array(W * H);
  const st = [];
  for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
  while (st.length) {
    const i = st.pop();
    if (seen[i] || !near(i, 12)) continue;
    seen[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1);
    if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W);
  }
  for (const [x0, y0, x1, y1] of [[2165, 495, 2350, 725], [405, 1185, 445, 1235]])
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * W + x; if (near(i, 8)) seen[i] = 1; }

  // ── 2. 物件遮罩 ────────────────────────────────────────────────────────
  const masks = {};
  for (const [name, obj] of Object.entries(M.OBJECTS)) masks[name] = obj.mask(orig);

  // 汽車影子：車身附近、比路面暗的像素
  const carBody = masks.car;
  const carNear = M.dilate(carBody, 16);
  const roadL = 118;
  const carShadow = new Uint8Array(W * H);
  for (let y = 935; y <= 992; y++) for (let x = 1092; x <= 1158; x++) {
    const i = y * W + x;
    if (!carBody[i] && carNear[i] && lum(i) < roadL - 14) carShadow[i] = 1;
  }
  // 船影：船身附近、比湖水暗的水
  const boatNear = M.dilate(masks.boat, 9);
  const boatShadow = new Uint8Array(W * H);
  for (let y = 1000; y <= 1090; y++) for (let x = 1450; x <= 1600; x++) {
    const i = y * W + x;
    if (!masks.boat[i] && boatNear[i] && lum(i) < 120) boatShadow[i] = 1;
  }

  // ── 3. 小圖（從原圖裁，alpha = 遮罩羽化）──────────────────────────────
  const geo = { size: [1600, 945], sprites: {}, occluders: {} };

  async function sprite(name, mask, box, { shadow = null } = {}) {
    const [x0, y0, x1, y1] = box;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const a = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = mask[(y + y0) * W + (x + x0)] ? 255 : 0;
    const soft = await sharp(Buffer.from(a), { raw: { width: w, height: h, channels: 1 } }).blur(0.6).extractChannel(0).raw().toBuffer();
    const out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const si = ((y + y0) * W + (x + x0)) * 4, di = (y * w + x) * 4;
      let al = soft[y * w + x];
      out[di] = orig[si]; out[di + 1] = orig[si + 1]; out[di + 2] = orig[si + 2];
      if (shadow && shadow[(y + y0) * W + (x + x0)] && al < 200) {
        // 影子：黑色半透明，深淺照路面變暗的程度
        const k = Math.min(0.62, Math.max(0, (roadL - lum((y + y0) * W + (x + x0))) / roadL * 1.4));
        out[di] = 18; out[di + 1] = 18; out[di + 2] = 22; al = Math.max(al, Math.round(k * 255));
      }
      out[di + 3] = al;
    }
    const file = `diorama/${name}.webp`;
    await fs.promises.mkdir(path.join(outDir, 'diorama'), { recursive: true });
    await sharp(out, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(path.join(outDir, file));
    const [bx, by] = toBase([x0, y0]);
    geo.sprites[name] = { file, x: bx, y: by, w: len(w), h: len(h) };
    return geo.sprites[name];
  }

  await sprite('train', masks.train, M.OBJECTS.train.box);
  await sprite('car', M.union(carBody, carShadow), [1092, 935, 1158, 992], { shadow: carShadow });
  await sprite('boat', masks.boat, M.OBJECTS.boat.box);
  await sprite('couple', masks.couple, M.OBJECTS.couple.box);
  await sprite('men', masks.men, M.OBJECTS.men.box);
  // 遠處那台（景深模糊、側面），汽車開上坡後換成它
  await sprite('carFar', masks.car2, M.OBJECTS.car2.box);

  // ── 4. 補背景（OpenCV Telea），有 Gemini 乾淨版就優先拿它補 ───────────────
  const holes = M.union(
    trainMoves ? M.dilate(masks.train, 3) : new Uint8Array(W * H), clipX(M.dilate(M.union(carBody, carShadow), 2), 1151), M.dilate(M.union(masks.boat, boatShadow), 3),
    M.dilate(masks.couple, 4), M.dilate(masks.men, 3), M.dilate(masks.car2, 2),
  );
  // 摩天輪底部兩個車廂（紅白）也補掉，留下的地面、樹在原處
  for (let y = 755; y <= 800; y++) for (let x = 2255; x <= 2335; x++) {
    const i = y * W + x, r = orig[i * 4], g = orig[i * 4 + 1], b = orig[i * 4 + 2];
    if ((r > 140 && r > g + 45) || (lum(i) > 200 && Math.abs(r - b) < 30)) holes[i] = 1;
  }
  const holesD = M.dilate(holes, 2);
  const isGreen = (i) => orig[i * 4 + 1] > orig[i * 4] + 6 && orig[i * 4 + 1] > orig[i * 4 + 2];
  for (let y = 690; y <= 730; y++) for (let x = 1376; x <= 1428; x++) { const i = y * W + x; if (isGreen(i)) { holes[i] = 0; holesD[i] = 0; } }
  for (let y = 900; y < 1000; y++) for (let x = 1152; x < 1200; x++) holesD[y * W + x] = holes[y * W + x];
  const rgb = new cv.Mat(H, W, cv.CV_8UC3);
  for (let i = 0; i < W * H; i++) { rgb.data[i * 3] = orig[i * 4]; rgb.data[i * 3 + 1] = orig[i * 4 + 1]; rgb.data[i * 3 + 2] = orig[i * 4 + 2]; }
  for (let y = 684; y <= 736; y++) for (let x = 1370; x <= 1434; x++) {
    const i = y * W + x;
    if (isGreen(i)) { rgb.data[i * 3] = 112; rgb.data[i * 3 + 1] = 114; rgb.data[i * 3 + 2] = 116; }
  }
  const mk = new cv.Mat(H, W, cv.CV_8UC1);
  for (let i = 0; i < W * H; i++) mk.data[i] = holesD[i] ? 255 : 0;
  const filled = new cv.Mat();
  cv.inpaint(rgb, mk, filled, 6, cv.INPAINT_TELEA);
  const out = Buffer.from(orig);
  for (let i = 0; i < W * H; i++) if (holesD[i]) { out[i * 4] = filled.data[i * 3]; out[i * 4 + 1] = filled.data[i * 3 + 1]; out[i * 4 + 2] = filled.data[i * 3 + 2]; }
  rgb.delete(); mk.delete(); filled.delete();

  // Telea 只適合小洞；有材質的地方改「從別處複製同材質」貼上（自動補色差、羽化）。
  // 有 Gemini 乾淨版就全部拿它補（自動找位移對齊）；沒有就用同一張圖旁邊的材質，火車那段只能先用 Telea。
  const { patchRegion } = require('./patch.cjs');
  const cleanRaw = cleanPath ? await sharp(cleanPath).resize(W, H, { fit: 'fill' }).ensureAlpha().raw().toBuffer() : null;
  const patchPlan = {
    ...(trainMoves ? { train: { mask: masks.train, box: M.OBJECTS.train.box, self: null } } : {}),
    car: { mask: M.union(carBody, carShadow), box: [1092, 935, 1158, 992], grain: 3.2 },
    boat: { mask: M.union(masks.boat, boatShadow), box: M.OBJECTS.boat.box, self: [-122, 4], opts: { colorFix: false } },
    couple: { mask: masks.couple, box: M.OBJECTS.couple.box, self: [54, 0] },
    men: { mask: masks.men, box: M.OBJECTS.men.box, tile: [1995, 940, 2030, 957] },
    car2: { mask: masks.car2, box: M.OBJECTS.car2.box, grain: 3.2 },
  };
  geo.patched = {};
  for (const [name, p] of Object.entries(patchPlan)) {
    let r = null;
    if (cleanRaw) r = patchRegion({ out, orig, src: cleanRaw, W, H, mask: p.mask, box: p.box, search: 14 });
    else if (p.self) r = patchRegion({ out, orig, src: orig, W, H, mask: p.mask, box: p.box, offset: p.self, ...(p.opts ?? {}) });
    else if (p.tile) r = addTexture(out, orig, holesD, p.box, p.tile);
    else if (p.grain) r = addGrain(out, holesD, p.box, p.grain);
    geo.patched[name] = r ? (cleanRaw ? 'clean' : 'texture') : 'telea';
    console.log(`patch ${name}:`, r ? JSON.stringify(r) : 'telea only');
  }

  // ── 5. 擦掉摩天輪（輪子以上的非綠色像素）；底座、樹、地面留著 ────────────
  for (let y = 470; y < 762; y++) for (let x = 2176; x <= 2385; x++) {
    const i = y * W + x, r = orig[i * 4], g = orig[i * 4 + 1], b = orig[i * 4 + 2];
    const green = g > r + 6 && g > b;
    // 塔樓那側（x<2189）只擦深灰鋼構，米色石材留著
    if (x < 2189 && !(lum(i) < 120 && Math.max(r, g, b) - Math.min(r, g, b) < 28)) continue;
    if (!green) seen[i] = 1;
  }

  // ── 6. 遮擋物：火車經過的松樹、摩天輪前的高樹 ─────────────────────────
  const pinePoly = [[998, 700], [1092, 664], [1096, 760], [1090, 852], [1000, 858]];
  const pineMaskPoly = M.polyMask(pinePoly);
  const pines = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (pineMaskPoly[i]) {
    const r = orig[i * 4], g = orig[i * 4 + 1], b = orig[i * 4 + 2];
    if (g > r + 6 && g >= b - 4 && lum(i) < 128) pines[i] = 1;
  }
  const pinesC = M.close(pines, 2);
  await sprite('pines', pinesC, [995, 660, 1100, 862]);
  geo.occluders.pines = geo.sprites.pines; delete geo.sprites.pines;

  const tree = new Uint8Array(W * H);
  for (let y = 700; y <= 835; y++) for (let x = 2184; x <= 2236; x++) {
    const i = y * W + x, r = orig[i * 4], g = orig[i * 4 + 1], b = orig[i * 4 + 2];
    if (g > r + 4 && g >= b) tree[i] = 1;
  }
  await sprite('wheelTree', M.close(tree, 2), [2184, 700, 2236, 835]);
  geo.occluders.wheelTree = geo.sprites.wheelTree; delete geo.sprites.wheelTree;

  // ── 7. 底圖輸出 ─────────────────────────────────────────────────────────
  for (let i = 0; i < W * H; i++) out[i * 4 + 3] = seen[i] ? 0 : 255;
  const alpha = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).extractChannel(3).blur(0.8).raw().toBuffer();
  for (let i = 0; i < W * H; i++) out[i * 4 + 3] = alpha[i];
  const framed = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: CROP.left, top: CROP.top, width: CROP.width, height: CROP.height })
    .extend({ top: CROP.pad, bottom: CROP.pad, left: CROP.pad, right: CROP.pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
  for (const w of [1600, 900]) {
    const res = await sharp(framed).resize({ width: w, kernel: 'lanczos3' })
      .webp({ quality: 82, alphaQuality: 90, effort: 6, smartSubsample: true })
      .toFile(path.join(outDir, `diorama-${w}.webp`));
    console.log(`diorama-${w}.webp ${res.width}x${res.height} ${(res.size / 1024).toFixed(0)} KB`);
  }
  // --debug：原圖座標的全尺寸補背景結果，放暫存資料夾檢查用
  if (flags.includes('--debug')) {
    const dbg = path.join(os.tmpdir(), 'diorama-filled.png');
    await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(dbg);
    console.log('debug:', dbg);
  }

  // ── 8. 幾何：路徑、錨點、摩天輪（全部換成底圖座標）────────────────────────
  const P = (pts) => pts.map(toBase);
  geo.train = {
    // 鐵軌中心線，左下島緣 → 右上（橋上那段被火車擋住，用前後兩段連起來）
    path: P([[552, 1045], [567, 1040], [630, 1017], [692, 992], [755, 965], [890, 893], [989, 841], [1084, 792], [1140, 772], [1220, 744], [1300, 716], [1360, 688], [1400, 670], [1422, 660]]),
    anchor: toBase([890.5, 893.5]), // 原位時車身近側下緣中點（在中心線上）
    wheelbase: len(223),
  };
  geo.car = {
    path: P([[1020, 1105], [1048, 1068], [1078, 1030], [1104, 993], [1122, 963], [1136, 930], [1144, 897], [1148, 868], [1156, 840], [1176, 814], [1210, 795], [1260, 778], [1320, 757], [1375, 731], [1412, 707], [1440, 684]]),
    anchor: toBase([1131, 962]),
    farAnchor: toBase([1404, 710]),
  };
  geo.train.moves = trainMoves;
  geo.boat = { axis: [0.959, 0.284], amp: len(22), anchor: toBase([1525, 1045]) };
  geo.walkers = { couple: { amp: len(22), period: 13 }, men: { amp: len(24), period: 11 } };
  geo.wheel = {
    center: toBase([2237, 651]), rx: len(112), ry: len(141), rotDeg: 3,
    back: [len(26), len(-8)],
    clipX: toBase([2189, 0])[0],
    legs: [
      [toBase([2237, 651]), toBase([2209, 797])], [toBase([2237, 651]), toBase([2253, 799])],
      [toBase([2263, 643]), toBase([2265, 792])], [toBase([2263, 643]), toBase([2303, 783])],
    ],
    ground: toBase([0, 795])[1],
  };
  await fs.promises.writeFile(path.join(ROOT, 'src/data/diorama-scene.json'), `${JSON.stringify(geo, null, 2)}\n`);
  console.log('sprites:', Object.keys(geo.sprites).join(', '), '| occluders:', Object.keys(geo.occluders).join(', '));
  process.exit(0);
})();
