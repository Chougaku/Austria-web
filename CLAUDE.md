# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

歐式護照風的奧地利＋慕尼黑旅遊儀表板（React 19 + TS + Vite），以 hsjinde/Osaka-web 為範本改寫。
內容資料來自另一個 repo Austria-vault（Obsidian markdown，本機 `D:\奧地利-vault`），收藏/待辦狀態
存 Cloudflare D1 做跨裝置同步，每日行程可在儀表板上編輯並由 Worker commit 回 vault。

行程：暫定 2027/06/14–06/30，維也納 3 → 格拉茨 1 → 鹽湖區（住 Bad Ischl）3 → 薩爾茲堡 2 →
因斯布魯克 2 → 慕尼黑 3 晚；維也納到因斯布魯克自駕，因斯布魯克到慕尼黑火車。

- 網站：GitHub Pages `chougaku.github.io/Austria-web/`；Cloudflare Pages 專案 `austria`（選用）
- 後端：Worker `https://austria-dashboard.chougaku.workers.dev`（2026-10-03 上線，D1 `austria-trip` 在 APAC）
- 產品定位見 `PRODUCT.md`；設計 token（色票、字體、郵戳風格）見 `DESIGN.md`。
  **凡涉及視覺/樣式的改動，動手前先讀 `DESIGN.md`**，遵循其色票與歐式旅券風格定義。

## Commands

Frontend（repo root）：
```
npm install
npm run dev          # 先 build:data 再啟動 vite（讀 NOTES_DIR 指向的本機 vault）
npm run build:data   # 只重跑 vault -> src/data/*.json 的轉譯（tsx scripts/build-data.ts）
npm run build        # tsc -b && vite build
npm run lint         # oxlint（不是 ESLint，規則見 .oxlintrc.json）
npm test             # vitest run（scripts/**/*.test.ts + src/**/*.test.{ts,tsx}）
npm run sync:images  # 攻略／實體圖片同步到 R2（需 R2 相關 env）
```
執行單一測試檔：`npx vitest run src/state/__tests__/store.test.tsx`（或任何路徑）。

Worker（`worker/` 子目錄，**獨立的 npm 專案**，不在 root 的 `npm test` 範圍內）：
```
cd worker
npm test        # vitest run
npm run dev     # wrangler dev
npm run deploy  # wrangler deploy
```

`.env`（repo root，勿提交）欄位見 `.env.example`：`NOTES_DIR`（本機 vault 路徑，
`D:\奧地利-vault`）、`VITE_API_BASE`（Worker URL，留白則前端純 localStorage 離線模式）、
Cloudflare 與 R2 設定。

## Architecture

### 資料管線（vault → 網站）

三段：vault markdown → (`build:data` + Zod 驗證) → `src/data/*.json` → Vite build → 靜態網站。

- `scripts/build-data.ts` 是建置入口：讀 `NOTES_DIR` 下的 vault，呼叫 `scripts/lib/parse-*.ts`
  逐一解析，用 `src/data/schema.ts` 的 Zod schema 驗證後寫出 JSON 到 `src/data/`。
  任一必要來源解析失敗即 `process.exit(1)`（讓 CI 紅燈），但「別人推薦攻略」是 best-effort。
  - 實體（餐廳/景點/購物/交通/住宿/區域）：`vault/wiki/entities/<分類>/*.md`（`<分類>總覽.md` 是索引頁，略過）
  - 每日行程：`vault/wiki/dashboard/每日行程.md`（`## Day N｜日期｜主題` + `> 區域：` + `- 時段｜標題｜備註`）
  - 總覽：`vault/wiki/dashboard/總覽.md`，`scripts/lib/parse-overview.ts` 解析五段：
    `## 基本資訊`（出發/回程 YYYY-MM-DD 等欄位）、`## 住宿`（`- 城市｜MM/DD–MM/DD｜飯店或待訂｜停車｜備註`）、
    `## 移動`（`- MM/DD｜飛機/自駕/火車｜A → B｜備註`）、`## 預訂`（`- 項目｜狀態｜細節`）、`## 交通備註`
  - 待辦：`vault/Austria Trip/行程筆記.md` 的 `## ✅ 待辦`（路徑常數 `TODO_FILE`）
  - 攻略：`vault/原始資料/別人行程/*.md`；圖片只在設了 `R2_PUBLIC_URL_PREFIX` 時才改寫成 R2 網址（key 前綴 `austria/`）
- `src/data/index.ts` 把建置產出的 JSON 轉型匯出（`entities`/`days`/`todos`/`overview`/`meta`/`guides`），
  是應用程式讀資料的唯一入口，元件不直接 import JSON。
- **這些 JSON 是產物，不是原始碼**：改資料內容要去改 vault（或用行程編輯回寫），不是改這裡的 `.json`。

### 城市與區域（`src/data/areas.ts`）

- `CITIES`：6 座城市，**依行程順序**；路線圖、路線區域列、地圖連線都照這個順序。`base` 標住宿所在區（鹽湖區住巴德伊舍）。
- `AREAS`：每城一個 `isCity` 區（名稱＝城市名＝市中心/老城）＋城內分區與周邊一日遊點。`name` 就是實體 `area`、
  每日行程 `> 區域：` 的值；`town` 是 Google 地圖搜尋補的拉丁地名。
- `matchArea`：同一段文字**先找分區、找不到才退回城市**（地址最後一定寫城市名）；同層取最後出現的地名。
  **拉丁別名要整個字對上**（`wien` 不咬 `Wiener Schnitzel`），中文照子字串。郵遞區號寫成 `1130 wien` 這種別名。
- `src/data/__tests__/areas.test.ts` 會檢查每日行程、實體、住宿用到的地名都在 AREAS 裡——加新地名先改 areas.ts。

### 多城市行程輔助（`src/lib/trip.ts`）

`dayIso`（「06/15 週二」→ ISO）、`stayOnNight`（入住日 ≤ d < 退房日）、`legsOn`、`routeSegments`（相鄰城市配對總覽的移動）、
`stayOfCity`、`todayIndex`（旅途中每日行程預設停在今天）、`LEG_META`（方式的符號與中文）、`inCity`（城市篩選）。

### 行程編輯回寫（網站 → vault，唯一的反向路徑）

1. `src/state/itinerary.tsx` 的 `ItineraryProvider` 管編輯狀態，變更即存 localStorage override
   （`austria-itinerary-override`，記錄 `baseBuiltAt`）。override 只在其 `baseBuiltAt` 不早於目前 `meta.builtAt` 時採用。
2. `save()` 用 `src/lib/itinerary-md.ts` 的 `serializeDays` 序列化回 markdown，經 `putItinerary` 打 `PUT /api/itinerary`。
3. Worker 透過 GitHub Contents API 把 `每日行程.md` 的 `## Day` 區塊整段換掉（保留前言），commit 回 Austria-vault。
   sha 衝突回 409，前端顯示「檔案已在他處變更」。
4. vault 的 push 觸發 `repository_dispatch: vault-updated` → 本 repo 重新 build。

### 狀態同步（收藏/待辦）

`src/state/store.tsx` 的 `TripStateProvider`（`useTripState`）是收藏/待辦唯一狀態來源（localStorage key `austria-trip-state`）。
本地永遠先寫 localStorage，若 `configured()`（有 `VITE_API_BASE` 且有 token）才同步到 Worker；
啟動與切回前景（距上次 ≥15 秒）會先補送離線佇列再拉遠端 merge（遠端優先）。沒有 token＝唯讀；Worker 打不通＝離線模式。

### 登入/權限

共用密碼制：`POST /api/login` 用密碼（Worker secret `DASH_PASSWORD`）換寫入 token（即 `DASH_TOKEN`），
存 localStorage（`austria-dash-token`）。`?setup=<token>` 可一鍵完成新裝置設定。
頁首「登入編輯」只在有 `VITE_API_BASE` 時出現。secret 沒設時 Worker 一律擋（登入回 503、寫入回 401），
前端把 503／連不上顯示成「連不上伺服器」，401 才是「密碼錯誤」。換 `DASH_PASSWORD` 不會登出已登入的裝置（token 沒變），
要全部登出得換 `DASH_TOKEN`。密碼本身只存在 Cloudflare secret，**不要寫進 repo（兩個 repo 都公開）**。

### Worker（`worker/src/index.ts`，Hono + D1）

- 單一資料表 `state(key, value, updated_at)`（`worker/schema.sql`）。
- `GET /api/state` 與 `POST /api/login` 免驗證，其餘要 `Authorization: Bearer <DASH_TOKEN>`。
- CORS 白名單來自 `wrangler.toml` 的 `ALLOWED_ORIGINS`（逗號分隔，預設 `austria.pages.dev` 與 `chougaku.github.io`），
  本機任意 port 放行。綁自訂網域時改這裡。
- `wrangler.toml`：D1 綁定 `DB`（database `austria-trip`，id 已填）；`workers_dev = true`、`preview_urls = false`；
  `[vars]` 有 `GH_OWNER=Chougaku`/`GH_REPO=Austria-vault`/`GH_BRANCH`/`GH_ITINERARY_PATH`。
- Worker secrets（存在 Cloudflare，本機取不到）：`DASH_TOKEN`、`DASH_PASSWORD`、`GITHUB_TOKEN`（要能寫 Austria-vault）。

### 部署（`.github/workflows/deploy.yml`）

push 到 main、收到 vault 的 `repository_dispatch: vault-updated`、或手動觸發：
- `build` + `deploy`：checkout 本 repo + `Chougaku/Austria-vault`（私有時用 secret `VAULT_READ_TOKEN`）→ build:data → build → GitHub Pages
- `deploy-cf-pages`：只在 variable `CF_PAGES_ENABLED == 'true'` 時跑；設了 `R2_PUBLIC_URL_PREFIX` 才跑 sync:images；
  `pages deploy dist --project-name austria`。需要 secrets `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。
- Variables：`VITE_API_BASE`（Worker 網址）、`R2_PUBLIC_URL_PREFIX`、`CLOUDFLARE_R2_BUCKET_NAME`。

`vite.config.ts` 的 `base` 依 `VITE_CF_PAGES` 切換 `/`（Cloudflare Pages）或 `/Austria-web/`（GitHub Pages）。

### 頁面/元件

`src/App.tsx` 用 `location.hash` 做無 router 的分頁切換，分頁定義在 `src/lib/tabs.ts`。
- `Home`：立體地景（`public/diorama-*.webp`，旅券票根與行程摘要釘在島底下兩角）→ `RouteHero`（手繪路線圖；手機換蛇形版）
  → 住宿 6 段、移動、預訂、待辦、收藏。換地景圖的流程見 `DESIGN.md`「立體地景」。
- `DailyPlan`：17 天日期列（換城日標方式符號）、標題下「當天移動＋今晚住哪」、時間軸／卡片／地圖三檢視。
- `Food` / `Places`：類型＋城市篩選（`CityChips`）。`Transport`：路段時間軸＋自駕／火車／市內三區。
- `AreaMap`：Leaflet 地圖（郵戳依螢幕距離自動合併、畫路線）＋`AreaRail` 路線區域列＋周邊一日遊。
共用小元件在 `src/components/`（`Chip`、`Heart`、`MapLink`、`Stamp`、`WishList`、`MarkdownBody`、`EntityPicker` 等）。

## Notes

- 測試框架是 Vitest（不是 Jest），元件測試用 `@testing-library/react` + `jsdom`。依實際 vault 內容變動的測試請 mock `../data`。
- 專案內有 `.claude/skills/cloudflare-use`（D1 / R2 操作優先用它）與 `entity-images`（幫實體找圖、嵌圖）技能。

## 偏好

- 與使用者溝通一律使用**繁體中文**（程式碼、識別字、檔名維持原文）。
