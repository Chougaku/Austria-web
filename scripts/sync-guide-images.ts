/**
 * 把攻略（原始資料/別人行程）引用到的圖片上傳到 Cloudflare R2。
 * 本機執行：`npm run sync:images`（token 從 .env 注入）。CI 不需執行此腳本——
 * build-data 只做網址改寫，圖片由 R2 提供。
 */
import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { resolveGuideImage, guideImageKey, extractImageSrcs, collectEntityImageFiles } from './lib/guide-images';

const vault = process.env.NOTES_DIR;
if (!vault || !fs.existsSync(vault)) {
  console.error(`NOTES_DIR 未設定或不存在：${vault}`);
  process.exit(1);
}
if (!process.env.CLOUDFLARE_API_TOKEN) {
  console.error('缺 CLOUDFLARE_API_TOKEN（見 .env）——需具 R2 寫入權限。');
  process.exit(1);
}

const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
if (!bucket) {
  console.error('缺 CLOUDFLARE_R2_BUCKET_NAME（見 .env）——要上傳到哪個 R2 bucket。');
  process.exit(1);
}
const guidesDir = path.join(vault, '原始資料/別人行程');
const assetRoots = [path.join(vault, 'assets'), path.join(vault, '原始資料/attachments')];

// 收集所有攻略引用、且能解析到實檔的圖片（key 去重）
const files = new Map<string, string>();
if (fs.existsSync(guidesDir)) {
  for (const f of fs.readdirSync(guidesDir).filter((n) => n.endsWith('.md'))) {
    const body = fs.readFileSync(path.join(guidesDir, f), 'utf8');
    for (const src of extractImageSrcs(body)) {
      const abs = resolveGuideImage(src, guidesDir, assetRoots);
      if (abs) files.set(guideImageKey(abs), abs);
      else console.warn(`⚠ 解析不到圖片：${src}（於 ${f}）`);
    }
  }
}

// entity 圖片（交通等分類）一併上傳
for (const [key, abs] of collectEntityImageFiles(vault, assetRoots)) files.set(key, abs);

if (files.size === 0) {
  console.log('沒有可上傳的圖片。');
  process.exit(0);
}

// 先複製到 ASCII 暫存路徑，避免 Windows cmd 處理含中文的 vault 路徑時亂碼
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r2-guide-'));
console.log(`準備上傳 ${files.size} 張圖片到 R2 bucket「${bucket}」…`);
let ok = 0;
for (const [key, abs] of files) {
  const tmpFile = path.join(tmp, key.replace(/[/]/g, '_'));
  fs.copyFileSync(abs, tmpFile);
  try {
    execSync(`npx wrangler r2 object put "${bucket}/${key}" --file="${tmpFile}" --remote`, {
      stdio: ['ignore', 'ignore', 'pipe'],
      env: process.env,
    });
    console.log(`  ✓ ${key}`);
    ok++;
  } catch (e) {
    console.error(`  ✗ 失敗：${key}\n    ${e instanceof Error ? e.message : e}`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`✅ 完成：${ok}/${files.size} 張已上傳到 R2。`);
if (ok < files.size) process.exit(1);
