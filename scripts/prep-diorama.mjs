// 把 AI 生成的立體地景整理成首頁用的 public/diorama-1600.webp、diorama-900.webp。
//
// 用法（sharp 不是專案依賴，用完不留）：
//   npm i --no-save sharp
//   node scripts/prep-diorama.mjs <原圖> public [--white-tol=12] [--clear=x0,y0,x1,y1 ...]
//
// - 原圖有透明背景：直接羽化邊緣、裁邊、縮圖。
// - 原圖是白底／米白底：背景色取四邊平均，從四邊 flood fill，跟背景色差 tol 以內又跟邊框連通的像素清成全透明。
//   島上的白教堂、雪山不跟邊框連通就不會被吃掉。
// - 被圍住、碰不到邊框的背景（摩天輪輪框內、樹根之間）用 --clear 指定範圍（原圖座標）另外清。
// - 最後 alpha 羽化 0.8px、裁掉透明邊、四周留 2%，輸出 1600w 與 900w 的 webp。
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const [input, outDir = '.', ...flags] = process.argv.slice(2);
if (!input) {
  console.error('usage: node scripts/prep-diorama.mjs <input> <outDir> [--white-tol=12] [--clear=x0,y0,x1,y1 ...]');
  process.exit(1);
}
const tol = Number(flags.find((a) => a.startsWith('--white-tol='))?.split('=')[1] ?? 12);

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];

let transparent = 0;
for (let i = 0; i < W * H; i++) if (data[i * 4 + 3] < 250) transparent++;
const hasAlpha = transparent / (W * H) > 0.05;
console.log(`input ${W}x${H}, ${hasAlpha ? 'transparent background' : 'opaque background'}`);

if (!hasAlpha) {
  // 背景色取四邊像素的平均——AI 圖的「白底」常是米白（Gemini 是 253,253,245），拿純白當基準會清不乾淨。
  const border = [];
  for (let x = 0; x < W; x += 4) border.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y += 4) border.push(y * W, y * W + W - 1);
  const bg = [0, 1, 2].map((c) => Math.round(border.reduce((sum, i) => sum + data[i * 4 + c], 0) / border.length));
  console.log('background colour', bg.join(','));
  const near = (i, t) => { const p = px(i); return Math.max(...[0, 1, 2].map((c) => Math.abs(p[c] - bg[c]))) <= t; };

  const seen = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const i = stack.pop();
    if (seen[i] || !near(i, tol)) continue;
    seen[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < W - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - W);
    if (y < H - 1) stack.push(i + W);
  }

  // 只在指定範圍內收緊到差 8 以內——不能全圖做，雪山上最亮的雪跟背景幾乎同色。
  for (const flag of flags.filter((a) => a.startsWith('--clear='))) {
    const [x0, y0, x1, y1] = flag.slice('--clear='.length).split(',').map(Number);
    let n = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * W + x;
        if (!seen[i] && near(i, 8)) { seen[i] = 1; n++; }
      }
    }
    console.log(`cleared ${n} enclosed background pixels in [${x0},${y0},${x1},${y1}]`);
  }

  // 背景直接全透明，不做 color-to-alpha：米白的藍色通道是 245，離 255 只差 10，
  // 一點雜訊就會被放大成滿版的半透明白點。邊緣交給下面的羽化。
  let cleared = 0;
  for (let i = 0; i < W * H; i++) if (seen[i]) { data[i * 4 + 3] = 0; cleared++; }
  console.log(`cleared ${(cleared / (W * H) * 100).toFixed(1)}% of pixels as background`);
}

const alpha = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).extractChannel(3).blur(0.8).raw().toBuffer();
for (let i = 0; i < W * H; i++) data[i * 4 + 3] = alpha[i];

const cut = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
const trimmed = await sharp(cut).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
const pad = Math.round(trimmed.info.width * 0.02);
const framed = await sharp(trimmed.data)
  .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

await mkdir(outDir, { recursive: true });
for (const w of [1600, 900]) {
  const out = join(outDir, `diorama-${w}.webp`);
  const res = await sharp(framed).resize({ width: w, kernel: 'lanczos3' })
    .webp({ quality: 82, alphaQuality: 90, effort: 6, smartSubsample: true })
    .toFile(out);
  console.log(`${out}: ${res.width}x${res.height}, ${(res.size / 1024).toFixed(0)} KB`);
}
