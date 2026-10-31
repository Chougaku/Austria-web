import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { CATEGORIES, MetaSchema, type Entity, type Guide } from '../src/data/schema';
import { parseEntity } from './lib/parse-entity';
import { parseItinerary } from './lib/parse-itinerary';
import { parseTodos } from './lib/parse-todos';
import { parseGuide } from './lib/parse-guide';
import { buildOverview } from './lib/parse-overview';
import {
  resolveGuideImage, guideImageKey, rewriteImageUrls, entityImageUrl, publishLocalImage, LOCAL_IMAGE_DIR, extractImageSrcs,
} from './lib/guide-images';

export { buildOverview };

/** 待辦清單所在的檔案（vault 相對路徑）：讀其中的「## ✅ 待辦」段落。 */
export const TODO_FILE = 'Austria Trip/行程筆記.md';

export function isEntityFile(cat: string, filename: string): boolean {
  return filename.endsWith('.md') && filename !== `${cat}總覽.md`;
}

/** vault 在 Windows 上簽出來是 CRLF，而各 parser 的區段正則都假設 LF
    （像 `## 基本資訊` 後面直接接換行）。不正規化的話本機建出來的資料會整批缺欄位、
    缺評分、缺區域，跟 CI（Linux，LF）建的不一樣。讀檔一律先轉成 LF。 */
const read = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

function main() {
  const vault = process.env.NOTES_DIR;
  if (!vault || !fs.existsSync(vault)) {
    console.error(`NOTES_DIR 未設定或不存在：${vault}`);
    process.exit(1);
  }
  const out = path.join(import.meta.dirname, '../src/data');
  fs.mkdirSync(out, { recursive: true });
  const write = (name: string, data: unknown) =>
    fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 1), 'utf8');

  // 圖片：設了 R2_PUBLIC_URL_PREFIX 就用 Cloudflare R2（npm run sync:images 上傳）；沒設就把用到的 vault 圖片
  // 複製進 public/vault-img/ 跟網站一起發布（網站上新增、編輯時上傳的圖都存在 vault 的 assets/）。
  // 每日行程的時段圖片一律走 public/vault-img/。http 開頭的外部圖片不動。
  const r2Base = (process.env.R2_PUBLIC_URL_PREFIX ?? '').replace(/\/+$/, '');
  const assetRoots = [path.join(vault, 'assets'), path.join(vault, '原始資料/attachments')];
  const publicDir = path.join(import.meta.dirname, '../public');
  fs.rmSync(path.join(publicDir, LOCAL_IMAGE_DIR), { recursive: true, force: true });
  const localUrl = (src: string, dir: string) => {
    const abs = resolveGuideImage(src, dir, assetRoots);
    return abs ? publishLocalImage(abs, publicDir) : null;
  };

  const errors: string[] = [];
  const entities: Entity[] = [];
  for (const cat of CATEGORIES) {
    const dir = path.join(vault, 'wiki/entities', cat);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((f) => isEntityFile(cat, f))) {
      try {
        const ent = parseEntity(cat, f, read(path.join(dir, f)));
        // 每張圖記下 vault 裡的寫法（編輯時拿掉照片要用）與網站網址；找不到檔的不列
        const urlOf = (src: string) => (/^https?:/i.test(src) ? src
          : r2Base ? entityImageUrl(src, dir, assetRoots, r2Base) : localUrl(src, dir));
        const images = extractImageSrcs(ent.body)
          .map((file) => ({ file, url: urlOf(file) }))
          .filter((i): i is { file: string; url: string } => !!i.url);
        if (images.length) ent.images = images;
        ent.body = rewriteImageUrls(ent.body, (src) => (/^https?:/i.test(src) ? null : urlOf(src)));
        entities.push(ent);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
  }

  // 別人推薦攻略（補充內容：best-effort，解析失敗只警告不擋建置）
  const guides: Guide[] = [];
  const guidesDir = path.join(vault, '原始資料/別人行程');
  if (fs.existsSync(guidesDir)) {
    for (const f of fs.readdirSync(guidesDir).filter((f) => f.endsWith('.md'))) {
      try {
        const g = parseGuide(f, read(path.join(guidesDir, f)));
        g.body = rewriteImageUrls(g.body, (src) => {
          const abs = resolveGuideImage(src, guidesDir, assetRoots);
          if (!abs) return null;
          return r2Base ? `${r2Base}/${guideImageKey(abs)}` : publishLocalImage(abs, publicDir);
        });
        guides.push(g);
      } catch (e) {
        console.warn(`⚠ 攻略略過 ${f}：${e instanceof Error ? e.message : e}`);
      }
    }
  }

  let days, todos, overview;
  try {
    days = parseItinerary(read(path.join(vault, 'wiki/dashboard/每日行程.md')));
    const planDir = path.join(vault, 'wiki/dashboard');
    for (const s of days.flatMap((d) => d.slots)) {
      for (const img of s.images ?? []) {
        const url = localUrl(img.file, planDir);
        if (url) img.url = url;
        else if (!/^https?:\/\//i.test(img.file)) console.warn(`⚠ 每日行程的圖片找不到：${img.file}`);
      }
    }
  } catch (e) { errors.push(String(e instanceof Error ? e.message : e)); }
  try {
    overview = buildOverview(read(path.join(vault, 'wiki/dashboard/總覽.md')));
  } catch (e) { errors.push(String(e instanceof Error ? e.message : e)); }
  try {
    todos = parseTodos(
      read(path.join(vault, TODO_FILE)),
    );
  } catch (e) { errors.push(String(e instanceof Error ? e.message : e)); }

  if (errors.length || !days || !todos || !overview) {
    console.error(`❌ 資料建置失敗（${errors.length} 個錯誤）：`);
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
  }

  const meta = MetaSchema.parse({
    builtAt: new Date().toISOString(),
    tripStart: overview.fields['出發'],
    tripEnd: overview.fields['回程'],
  });

  write('entities.json', entities);
  write('days.json', days);
  write('todos.json', todos);
  write('overview.json', overview);
  write('meta.json', meta);
  write('guides.json', guides);
  console.log(
    `✅ 建置完成：${entities.length} 實體、${days.length} 天行程、${todos.length} 待辦、${guides.length} 攻略`,
  );
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main();