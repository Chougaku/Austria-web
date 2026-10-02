---
name: entity-images
description: 幫 Austria-vault 的實體（entities，尤其交通/景點/餐廳）搜圖、下載、嵌入 markdown，並經 R2 管線讓圖片真的顯示在網站上。當使用者說「幫我把圖片查出來附上」「附上停靠站/路線圖」「entity 沒看到圖片」「圖片名稱好像有問題」時觸發。
---

# entity-images：實體圖片一條龍（搜圖 → 嵌入 → R2 → 上線）

替 Austria-vault 的實體 markdown 找到並附上真實圖片，走完整條 R2 管線，
**並在宣稱完成前實際驗證圖片能被公開網域服務**。這條流程過去反覆手動做、
且踩過「中文檔名 R2 404」的坑（見原專案 Osaka-web 的 commit `76960c3`）——本 skill 就是把它固化。

**開始時宣告：**「我正在使用 entity-images skill 幫實體附上圖片。」

## 何時用

- 使用者要求替某個/某些 entity 找圖並附上（`@wiki/entities/交通/*.md 幫我把圖片都查出來附上`）。
- 使用者回報「網站交通頁（`#trans`）沒看到圖片」「圖片名稱導致的錯誤」——直接跳到 §5 驗證與除錯。

## 前置事實（不要重新發現）

- 實體 markdown：`$NOTES_DIR/wiki/entities/<分類>/*.md`（分類＝交通/景點/餐廳/購物/住宿/區域）。
- 圖片實檔的 asset 根目錄：`$NOTES_DIR/assets` 與 `$NOTES_DIR/原始資料/attachments`
  （見 `scripts/sync-guide-images.ts` 的 `assetRoots`）。圖片放這兩處之一才收得到。
- 嵌入語法兩種都可：Obsidian `![[檔名.jpg]]` 或標準 `![](檔名.jpg)`；
  `parse-entity` / `embedsToImageMarkdown` 會處理。**src 只放檔名或相對路徑，別放 http**（http 會被跳過不上傳）。
- **R2 key 由 `imageKey(abs,'entities')` 產生＝純 ASCII slug + 8 碼 sha1 雜湊**
  （`scripts/lib/guide-images.ts`）。所以就算你的檔名是中文也不會壞——但**本機檔名仍請用有意義的 ASCII**
  （例：`oebb-railjet-route-map.jpg`），slug 才有可讀性。
- 公開網址前綴：`R2_PUBLIC_URL_PREFIX`（必填，沒設的話 build:data 不改寫圖片網址，見 `.env.example`）。
- **`npm run sync:images` 只在本機跑、CI 不上傳圖片**；需 `.env` 的 `CLOUDFLARE_API_TOKEN`（要有 R2 寫入權限）。
  bucket 由 `CLOUDFLARE_R2_BUCKET_NAME` 指定（必填）。

## 流程

### 1. 定位實體
讀目標 entity 檔，確認分類與現有內容。多檔就逐檔處理，別漏。

### 2. 搜真圖（用 Tavily）
用 `tavily_search`（或 `tavily_extract`）找**真實、具代表性**的圖：交通類找路線圖/停靠站圖/車輛外觀，
景點/餐廳找實景。**驗證每個圖片 URL 真的是圖片**（副檔名 png/jpg/jpeg/webp/gif，HTTP 200）。
找不到好圖就說明，別硬塞無關圖。

### 3. 下載到 vault asset 根目錄
把選定圖片存到 `$NOTES_DIR/原始資料/attachments/`（或 `$NOTES_DIR/assets/`），
**檔名用 ASCII**（`<entity-slug>-<描述>.jpg`）。

### 4. 嵌入 markdown
在 entity 檔適當位置加入 `![](<檔名>.jpg)`（或 `![[<檔名>.jpg]]`）。放在相關段落旁，附簡短說明。

### 5. 跑管線 + **驗證能顯示**（關鍵，別跳過）
```bash
npm run build:data     # 改寫 entity 圖片 → R2 encode 網址 + Zod 驗證；紅燈就先修
npm run sync:images    # 本機上傳圖片到 R2（需 .env CLOUDFLARE_API_TOKEN 具 R2 寫入權）
```
**上傳後、宣稱完成前，實際驗證公開網址可服務**（這步就是為了避免「我沒看到圖片」來回）：
- 用 `imageKey` 邏輯推出 key（`austria/entities/<slug>-<hash>.<ext>`），組出 `$R2_PUBLIC_URL_PREFIX/<key>`。
- `curl -I` 或 Read 該 URL，確認 **HTTP 200 且 content-type 是 image/**。R2 / bucket 操作優先用
  **`cloudflare-use` skill**（本 repo 已有）。
- 若 404：見下方除錯。

### 6. 收尾
兩個 repo 都要處理：Austria-vault（markdown＋圖檔）先 commit/push；Austria-web 若有改動再 push。
push Austria-vault 會觸發 `repository_dispatch` 讓網站重建。commit 訊息用繁中、末尾加
`Co-Authored-By` trailer（見 CLAUDE.md）。**只有在 §5 驗證過 200 才說「完成」。**

## 除錯：「entity 沒看到圖片」

按可能性排序，逐一用證據排除（別猜）：

1. **圖片沒上傳** — `sync:images` 沒在本機跑過，或 `.env` token 無 R2 寫入權 → 重跑並看輸出。
2. **src 是 http 或檔案不在 assetRoots** — `resolveGuideImage` 回 null → 圖不會被收集。改成本機檔名並放對資料夾。
3. **key/網址不符** — 用 `imageKey` 重算 key、`toPublicUrl` 重組網址，和頁面實際請求的 URL 比對。
4. **（歷史坑）含中文的 R2 key 404** — 現行 entity key 已強制 ASCII 雜湊；若仍見中文 key，代表走到舊路徑，
   確認用的是 `imageKey(...,'entities')` 而非 guides 分支。
5. 前端快取／`base` 路徑：確認看的是 Cloudflare Pages（base `/`）還是 GitHub Pages（base `/Austria-web/`）。

## 紅線

- **沒 `curl` 到 200 就不准說「圖片好了」。** 使用者是靠這句話決定要不要再開一輪的。
- 不要把外部 http 圖片 URL 直接塞進 markdown 當最終方案——它不會進 R2，網域一改就死。
- 不要為了交差塞不相關或版權不明的圖；找不到就明說。
