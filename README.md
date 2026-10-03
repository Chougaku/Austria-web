# 奧地利旅券 Austria-web

歐式護照風的奧地利＋慕尼黑旅遊儀表板（以 [Osaka-web](https://github.com/hsjinde/Osaka-web) 為範本）。
內容來自 Austria-vault（Obsidian），收藏與待辦狀態存 Cloudflare D1 跨裝置同步。

暫定 2027/06/14 出發、06/30 回到台灣：維也納 3 晚 → 格拉茨 1 晚 → 鹽湖區（Bad Ischl）3 晚 →
薩爾茲堡 2 晚 → 因斯布魯克 2 晚 → 慕尼黑 3 晚。維也納到因斯布魯克自駕，因斯布魯克到慕尼黑搭火車。

**網站：** GitHub Pages `https://chougaku.github.io/Austria-web/`（Cloudflare Pages 設定好後另有 `austria.pages.dev` 或自訂網域）

## 日常使用

### 更新旅遊資料（唯一需要記住的流程）

1. 在 Obsidian 編輯 `D:\奧地利-vault`：
   - 新增/修改餐廳、景點、購物、交通 → `wiki/entities/<分類>/`（格式照範例檔，「位置」欄寫城市或區域名）
   - 改每日行程 → `wiki/dashboard/每日行程.md`
   - 改日期、住宿、城市間移動、預訂狀態 → `wiki/dashboard/總覽.md`
   - 勾/改待辦 → `Austria Trip/行程筆記.md` 的「## ✅ 待辦」
2. push 到 GitHub
3. 約 2 分鐘後網站自動更新。若沒更新，看 Austria-web repo 的 Actions 是否紅燈
   （紅燈通常 = markdown 格式錯，錯誤訊息會寫哪個檔案哪一行）

### 格式速查

每日行程：

    ## Day 4｜06/18 週五｜維也納 → 格拉茨・自駕
    > 區域：維也納、格拉茨

    - 上午｜維也納取車｜備註文字
    - 晚上｜（待安排）

總覽的住宿、移動、預訂：

    ## 住宿
    - 維也納｜06/15–06/18｜飯店名（未訂寫「待訂」）｜停車｜備註

    ## 移動
    - 06/18｜自駕｜維也納 → 格拉茨｜備註        （方式：飛機／自駕／火車／巴士／渡輪）

    ## 預訂
    - 租車｜已訂｜細節                          （狀態寫「已訂／已確認／✅」就算完成）

`> 區域：` 與實體「位置」欄用網站認得的城市或區域名（定義在 `src/data/areas.ts`，
例如 維也納、美泉宮、哈修塔特、國王湖、北山、新天鵝堡）；地址寫德文也認得（「…, 1130 Wien」＝美泉宮）。

### 收藏 ♡ 與想去清單

在美食庫、景點、購物頁按 ♡ 標記想去的地方（可依城市篩選），首頁「已標記」橫幅可展開看清單。
不設通行密碼也能瀏覽（唯讀）；要能標記/勾選並同步，按 header 的「登入編輯」輸入共用密碼。
已登入的裝置按 ⚙ 會給一條「設定連結」，貼到新裝置開一次就完成設定。

## 開發

    npm install
    npm run dev        # 讀 D:\奧地利-vault（.env 的 NOTES_DIR）
    npm test           # 解析器 + 元件 + store 測試
    npm run lint
    npm run build
    cd worker && npm test   # Worker API 測試

`.env` 欄位見 `.env.example`。

## 架構

- **內容**：vault markdown --(build:data + Zod)--> JSON --> Vite build --> GitHub Pages / Cloudflare Pages
- **狀態**：前端 --(讀取免驗證，寫入用 Bearer 通行密碼)--> Cloudflare Worker（Hono）--> D1（austria-trip）
- **自動重建**：Austria-vault push --> notify-dashboard workflow --> repository_dispatch --> Austria-web deploy

## 上線設定清單

1. ✅ GitHub：`Chougaku/Austria-web`、`Chougaku/Austria-vault` 皆公開；Austria-web 開啟 GitHub Pages（Actions 來源）。
   vault 若改私有，在 Austria-web 加 Actions secret `VAULT_READ_TOKEN`。
2. ✅ Austria-vault 的 Actions secret `AUSTRIA_WEB_PAT`（對 Austria-web 有 contents 寫入權的 fine-grained token），push 後觸發網站重建。
3. ✅ Cloudflare 後端（登入編輯、收藏／待辦同步、行程回寫）：Worker `austria-dashboard`
   （`https://austria-dashboard.chougaku.workers.dev`）＋ D1 `austria-trip`，三個 secret 都設了，
   Austria-web 的 Actions variable `VITE_API_BASE` 指向這個網址。重做一次的步驟：
   - `cd worker && npx wrangler d1 create austria-trip`，把 database_id 填進 `worker/wrangler.toml`
   - `npx wrangler d1 execute austria-trip --remote --file=schema.sql`
   - `npm run deploy`（新帳號第一次會要你註冊 workers.dev 子網域）
   - `npx wrangler secret put DASH_TOKEN`、`DASH_PASSWORD`、`GITHUB_TOKEN`（GitHub token 要能寫 Austria-vault 的 Contents）
   - 把 Worker 網址設成 Austria-web 的 Actions variable `VITE_API_BASE`，重跑部署

   日常維護（都在 `worker/` 下執行，網站不用重建）：
   - 換登入密碼：`npx wrangler secret put DASH_PASSWORD`。已登入的裝置不會被登出。
   - 讓所有裝置都登出：`npx wrangler secret put DASH_TOKEN`，貼一串新的亂數。
   - 每日行程提交出現「Worker 的 GitHub token 已失效」：重建 token，`npx wrangler secret put GITHUB_TOKEN`。
4. Cloudflare Pages（選用）：Actions secrets `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`，variable `CF_PAGES_ENABLED=true`；
   綁自訂網域後把網址加進 `worker/wrangler.toml` 的 `ALLOWED_ORIGINS`。
5. 圖片上 R2（選用）：variables `R2_PUBLIC_URL_PREFIX`、`CLOUDFLARE_R2_BUCKET_NAME`。
