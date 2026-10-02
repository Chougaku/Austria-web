---
name: cloudflare-use
description: 操作本專案的 Cloudflare 資源——D1 資料庫 austria-trip（收藏/待辦同步狀態）與 R2 圖片儲存。只要使用者提到查資料庫、看 D1、確認收藏或待辦有沒有同步成功、檢查/上傳/下載 R2 圖片、驗證 Cloudflare 上的內容，或任何 wrangler 操作，都要用這個 skill。Use whenever the user asks to check the database, query D1, inspect sync state, or verify/upload R2 images.
---

# Cloudflare Use (D1 & R2)

Always use the scripts below — never hand-build `npx wrangler` commands. The scripts call the
Cloudflare REST API directly (credentials auto-read from repo-root `.env`), bypassing the shell
and wrangler entirely. That kills two real incidents: PowerShell writes BOMs that mojibake
Chinese text in D1, and its console codepage garbles output. It's also ~10x faster than npx.
Wrangler is only used for `--local` (local dev DB).

## Resources

- **D1**: `austria-trip`, single table `state(key TEXT PK, value TEXT, updated_at TEXT)`.
  `value` is the JSON sync state for favorites/todos (keys like `fav:餐廳/<id>`, `todo:<id>`).
- **R2**: bucket comes from `CLOUDFLARE_R2_BUCKET_NAME` in `.env` (not set up yet for this trip);
  this project's keys live under `austria/` — never touch keys outside it if the bucket is shared.
  Guide images: `austria/guides/<folder>/<file>`, served at `$R2_PUBLIC_URL_PREFIX/<key>`.
  Bulk-upload guide images with `npm run sync:images`, not one by one.
- **Credentials**: `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in repo-root `.env`.
  If missing, the scripts error out: walk the user through Cloudflare Dashboard → My Profile →
  API Tokens (needs D1 Edit + Workers R2 Storage Edit), write it to `.env`, never echo the token.

## D1

```
node .claude/skills/cloudflare-use/scripts/d1.cjs "SELECT key, updated_at FROM state"
node .claude/skills/cloudflare-use/scripts/d1.cjs path/to/statements.sql
```

- Arg is executed as a file if it's an existing `.sql` path (BOM auto-stripped), else as SQL text.
  Chinese, quotes, emoji, multi-statement — all safe.
- Long values truncate at 200 chars; `--full` shows everything. `--local` targets the dev DB.
- Writes are live user data: any UPDATE/DELETE on `state` changes what the user sees on all
  devices — SELECT the current value and confirm with the user first.

## R2

```
node .claude/skills/cloudflare-use/scripts/r2.cjs list [prefix] [--limit=100]
node .claude/skills/cloudflare-use/scripts/r2.cjs get <key> [local-file]
node .claude/skills/cloudflare-use/scripts/r2.cjs put <key> <local-file>   (content-type auto-detected)
node .claude/skills/cloudflare-use/scripts/r2.cjs delete <key>
```

## If something looks broken

- Garbled Chinese in terminal but the site renders fine → data is OK; it's the PowerShell console
  codepage. Verify with d1.cjs.
- Garbled Chinese actually in D1 → the SQL was run outside these scripts with a BOM'd file;
  re-run the write through d1.cjs.
- `Wrangler requires at least Node.js v22` → only happens running wrangler manually on an old
  machine; use `npx wrangler@3` there (the scripts pick the right version automatically).
