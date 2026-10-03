---
name: 奧地利旅券 REISEPASS
description: 歐式護照風的奧地利＋慕尼黑旅遊儀表板——夾著郵戳、票根與路線圖的旅券，明亮而有蓋章儀式感。
colors:
  austrian-red: "#C8102E"
  austrian-red-light: "#DA3349"
  ink: "#22201C"
  passport-paper: "#F3EFE6"
  card: "#FCFAF5"
  bavarian-navy: "#1E355C"
  fir-green: "#2D6A4F"
  schoenbrunn-gold: "#E5A93A"
  taupe: "#685F50"
  taupe-light: "#736A5B"
  taupe-dark: "#514A3E"
  water: "#7FA6C4"
  lake: "#BCD3E3"
  hairline: "#22201C24"
  hairline-strong: "#22201C40"
  stamp-paper: "#F8F5EE"
typography:
  display:
    fontFamily: "Bodoni Moda, Noto Serif TC, serif"
    fontSize: "46px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "Bodoni Moda, Noto Serif TC, serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.12em"
  title:
    fontFamily: "Bodoni Moda, Noto Serif TC, serif"
    fontSize: "18px"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Noto Sans TC, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "normal"
  label:
    fontFamily: "Noto Sans TC, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.25em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "7px 16px"
  chip-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.stamp-paper}"
    rounded: "{rounded.pill}"
    padding: "7px 16px"
  chip-on-red:
    backgroundColor: "{colors.austrian-red}"
    textColor: "{colors.stamp-paper}"
    rounded: "{rounded.pill}"
    padding: "7px 16px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "22px 24px"
  banner-dark:
    backgroundColor: "{colors.bavarian-navy}"
    textColor: "{colors.stamp-paper}"
    rounded: "{rounded.lg}"
    padding: "18px 22px"
  postmark:
    textColor: "{colors.austrian-red}"
    rounded: "{rounded.pill}"
    size: "42px"
---

# Design System: 奧地利旅券 REISEPASS

## 1. Overview

**Creative North Star：「一本夾滿郵戳的歐式旅券」**

這個介面是一本護照兼旅行筆記：封面是一座浮在空中的微縮奧地利，翻開是一張手繪路線圖，六座城市各蓋一枚雙圈郵戳，
票根、預訂單、住宿清單像隨手夾進去的紙片。它不是行銷頁，也不是冷淡的效率工具——
是全家（旅伴）共同維護、期待出發的通行證。使用者在行前規劃、在維也納街頭或鹽湖區湖畔單手查詢，
介面要像翻護照一樣好翻、好查、看得懂。

系統以**奧地利紅**（austrian-red `#C8102E`）為唯一主聲音，落在主行動、當前分頁、自駕路線、警示與收藏；
**巴伐利亞深藍**（`#1E355C`）是深色錨點（摘要橫幅、郵戳、火車路線），**杉綠**＝完成、**申布倫金**＝收藏高光。
底色是象牙色護照紙（passport-paper `#F3EFE6`）疊一層極淡的橫紋，卡片亮一階（`#FCFAF5`）。
字體是 **Bodoni Moda 襯線（拉丁字、數字）＋ Noto Serif TC（中文標題）＋ Noto Sans TC（正文）**——
Bodoni 的高反差帶出歐洲印刷品與護照的儀式感，數字（倒數、日期 15.06.、評分）全靠它。

這套是從《大阪旅券》的和風御朱印帳**轉譯**來的：骨架不變（紙質、蓋章、襯線、色彩階級、手作的歪斜），
語彙換成中歐——朱印→郵戳、方章→火漆印、和紙→護照紙、日文標籤→德文標籤（REISEPASS、UNTERKUNFT、
BUCHUNG、COUNTDOWN）。它明確拒絕：**灰撲撲的復古褪色風**、**抹掉印章與襯線的中性 SaaS 介面**、
以及**沒有個性的 AI 暖白樣板**。

**Key Characteristics:**
- 象牙護照紙底 + 極淡橫紋，卡片亮一階，層次靠色調不靠陰影
- 奧地利紅是唯一主聲音；深藍／杉綠／申布倫金各守一種狀態語意
- Bodoni Moda 扛數字與拉丁字、Noto Serif TC 扛中文標題、Noto Sans TC 扛正文
- 雙圈郵戳、火漆印、票根虛線切口、歪斜旋轉——手作紙品的儀式感
- 路線是主角：自駕＝紅實線、火車＝藍虛線、飛機＝茶點線，地圖、區域列、行程頁同一套
- 行動優先：橫向捲動分頁與日期、觸控目標 ≥36px、單手可用

## 2. Colors

一組中歐印刷色盤：象牙紙作底，奧地利紅作章，深藍綠金各司一職。所有文字色在紙底與卡片底實測 ≥4.5:1。

### Primary
- **奧地利紅 Austrian Red** (`#C8102E`，紙底 5.1:1)：唯一的主聲音。主行動（登入編輯）、當前分頁 chip、
  倒數大數字、自駕路線、警示、收藏愛心開啟態、評分郵戳。出現即代表「這裡要注意」。
- **奧地利紅・亮** (`#DA3349`)：hover 與路線區域列的線條，不當文字色（紙底僅 4.0:1）。

### Secondary
- **巴伐利亞深藍 Bavarian Navy** (`#1E355C`)：深色橫幅（行程摘要、已標記）、城市郵戳、火車路線、景點標記。
- **杉綠 Fir Green** (`#2D6A4F`)：完成／確認專用——待辦打勾、住宿與預訂「✓ 已訂」。綠＝done。
- **申布倫金 Schönbrunn Gold** (`#E5A93A`)：收藏數字高光（只用在深藍底上，5.9:1）、搜尋命中底色。

### Neutral
- **墨 Ink** (`#22201C`)：正文與標題；chip 選中態底色。
- **護照紙 Passport Paper** (`#F3EFE6`)：body 底色，疊 1.8% 墨色橫紋。
- **卡紙 Card** (`#FCFAF5`)：卡片、輸入框、路線圖底，比 body 亮一階。
- **灰褐 Taupe** (`#685F50`) / **淺** (`#736A5B`) / **深** (`#514A3E`)：次要文字、標籤、頁尾。
- **水 Water** (`#7FA6C4`) / **湖 Lake** (`#BCD3E3`)：只用在路線圖的河流與湖泊。
- **界線 Hairline** (14% 墨) / **Hairline Strong** (25% 墨)：卡片邊框、虛線分隔。

### Named Rules
**The One Seal Rule.** 奧地利紅是**唯一**主聲音，任一畫面上作為填色的面積 ≤10%。可以描邊、做小徽章、
畫一條路線、蓋一枚章，不可以整片鋪（交通頁自駕區的色帶標頭是唯一的例外，且只有一行高）。

**The No-Grey Rule.** 禁止為了「優雅」而發灰的低飽和色。文字走墨／灰褐梯度或彩色；色塊上的文字用該色深階或文字色透明度。

## 3. Typography

**Display / Heading:** Bodoni Moda（opsz 6–96，字重 400–900）→ 中文 fallback Noto Serif TC（600–900）
**Body:** Noto Sans TC（400–700）
**Numeric / Code:** `ui-monospace, monospace`（只給訂單編號這類機械識別碼）

`--serif: 'Bodoni Moda', 'Noto Serif TC', serif`——拉丁字與數字由 Bodoni 排，中文自動落到 Noto Serif TC，
一個 `.serif` class 兩種文字都對。字級走**固定 px 級距**、非流體 clamp。

### Hierarchy
- **Display** (serif 800, 46px, lh 1)：票根上的倒數大數字，奧地利紅。
- **Headline** (serif 700, 21px, 字距 0.12em)：頁首「奧地利旅券」、票券主標。
- **Title** (serif 800, 18px)：卡片標題（住宿、移動、出發前待辦）。
- **Body** (Noto Sans TC 400, 13.5px, lh 1.75)：正文與攻略內文；長文 65–75ch。
- **Label** (Noto Sans TC 600, 12px, 字距 0.25em, 大寫)：德文小標籤（REISEPASS、UNTERKUNFT、BUCHUNG、ROUTE），灰褐。

### Named Rules
**The Serif-for-Ceremony Rule.** 襯線只給標題、數字、郵戳、城市名；正文、按鈕、密集資料一律 Noto Sans TC。
**The One Poster Title Exception.** 路線圖中央大標「Wien → München」（`.rh-title`）用 **Smythe**——
使用者指定，參考 Zermatt 旅遊影片片頭那種新藝術海報字。只此一處，不擴散到其他標題；
墨色、66px、同色 1.4px 描邊補字重（Smythe 只有一種字重）。曾試過照片頭做金橘漸層＋深色描邊，
放在淺色紙地圖上太搶、會壓過紅色路線，所以沒採用。
**The European Date Rule.** 郵戳與路線圖上的日期用歐式 `15.06.`；卡片與列表用 `6/15`（台灣讀者習慣）。

## 4. Elevation

**幾乎全平**——深度靠色調分層與 1px 邊框／虛線。陰影只在兩處出現且都是實的：
郵戳／火漆印的硬投影（`2px 2px 0 rgba(34,32,28,.18)`）與卡片 hover 的一次性抬升。

**The Flat-Paper Rule.** 表面預設全平。陰影是狀態的回應（hover、蓋章），不是裝飾；禁止「1px 邊框＋大模糊陰影」的幽靈卡。

## 5. Components

### 立體地景 Diorama（首頁主視覺）
- 跟 Osaka-web 原版一樣是一張 AI 生成的微縮立體地景：浮空的島、底下岩層剖面與樹根，由左（西）到右（東）擺
  慕尼黑聖母教堂＋五月樹、因斯布魯克黃金屋頂＋雪山、薩爾茲堡要塞與主教座堂、哈修塔特湖畔與教堂、格拉茨鐘塔、
  維也納史蒂芬大教堂＋摩天輪，紅火車與紅色小車串起來。2026-10 用 Gemini 生成。
- 檔案：`public/diorama-1600.webp`、`diorama-900.webp`（透明底，`srcSet` 讓手機拿 900w）。7.5 秒上下浮動，
  `prefers-reduced-motion` 時不動。
- 卡片：這張圖的景點頂到上方兩角，所以旅券票根與行程摘要釘在**島底下左右兩角**（只壓到岩層與樹根），
  不照原版釘在天空。≤1000px 卡片回到流式排版、地景在最前。換圖後要重看卡片有沒有壓到景點。
- 換圖：AI 生的圖若是米白底，用 `scripts/prep-diorama.mjs` 去背、裁邊、輸出兩種寬度
  （`npm i --no-save sharp` 後 `node scripts/prep-diorama.mjs <原圖> public`）。從四邊 flood fill 清背景；
  被圍住的背景（摩天輪輪框內）用 `--clear=x0,y0,x1,y1` 指定範圍——這張圖是
  `--clear=2165,495,2350,725 --clear=405,1185,445,1235`。不能全圖清，雪山最亮的雪跟背景幾乎同色。
  原圖不進 repo。

### 路線圖 RouteHero（招牌元件）
- 首頁接在立體地景下面。
- 桌機：1600×900 的手繪地圖——經緯格線、多瑙河／茵河／薩爾察赫河、鹽湖區的湖、德奧國界點線、阿爾卑斯山稜線。
  六座城市各一枚雙圈郵戳：外圈上緣城市拉丁名、下緣國名（ÖSTERREICH／DEUTSCHLAND），中間入住日期 `15.06.` 與晚數。
- 手機（≤640px）：換成蛇形版（前三站一列、後三站倒著一列），同一套郵戳，字才看得清楚。
- 路線依總覽.md 的「移動」上色；薩爾茲堡→因斯布魯克那段往北彎進德國（Deutsches Eck）。

### 郵戳 Postmark
- 評分章（`.stamp`）、住宿晚數章（`.stay-mark`）、地圖標記（`.map-stamp`）都是雙圈：外框 1.5–1.6px＋內圈細線，
  `rotate(-5° ~ -6°)`。名字長的地圖標記拉成橢圓戳。未蓋態改灰褐描邊、透明底。

### 火漆印 Wax Seal
- 頁首 logo：奧地利紅、微不規則的圓、壓出一圈內環、中文「奧」字。favicon 是同一枚印，中間是山與湖。

### 同步郵戳 Sync Seal
- 26px 雙圈小郵戳寫「郵」，同步中以 `sealPulse` 呼吸。

### Chips / Cards / Buttons / Inputs
- Chip：膠囊、墨色 1px 描邊、min-height 36px；選中填墨，導航版選中填奧地利紅。橫向捲動列（`.hscroll`）。
- Card：10px 圓角、卡紙底、1px hairline；區塊內分隔用虛線。可點卡片 hover 抬升。
- 主行動：透明底、奧地利紅描邊與字；`:focus-visible` 一律奧地利紅 2px 外框。
- 輸入框：卡紙底、hairline-strong 描邊、8px 圓角；≤640px 字級 16px 防 iOS 縮放。

### 移動與住宿
- 移動列（`.leg-row`）：日期（Bodoni）＋方式符號＋路段＋方式小字（自駕紅、火車藍、飛機茶）。
- 每日行程換城日：日期鈕標方式符號，標題下方一列「🚗 自駕・維也納 → 格拉茨」與「今晚住 …」。
- 待訂一律虛線徽章（`.badge--todo`），已訂一律綠框（`.badge--done`）。

## 6. Do's and Don'ts

### Do
- **Do** 讓奧地利紅只當主聲音（≤10% 面積），深藍、杉綠、金各守其職。
- **Do** 用郵戳、火漆印、票根切口、歪斜旋轉承載識別度——它們是靈魂。
- **Do** 數字與日期一律 Bodoni；中文標題 Noto Serif TC；正文 Noto Sans TC。
- **Do** 讓自駕／火車／飛機在地圖、區域列、路線圖、行程頁用同一套顏色與線型。
- **Do** 行動優先：橫向捲動、觸控目標 ≥36–44px、`prefers-reduced-motion` 全面降級。
- **Do** 每個狀態清楚一致：已收藏、待辦完成（綠）、住宿／預訂待訂（虛線）、同步中（郵戳呼吸）、離線（虛線徽章）。

### Don't
- **Don't** 做成褪色、昏黃、低飽和的「復古旅行」濾鏡風。
- **Don't** 抹掉郵戳與襯線改走中性 SaaS 介面。
- **Don't** 落入沒有個性的 AI 暖白樣板：米底＋灰字＋圓角卡片無限複製。
- **Don't** 用中性灰做色塊上的文字；不要在休息態卡片疊柔散大陰影。
- **Don't** 把 chip／卡片圓角推到 16px 以上（膠囊只給 chip、郵戳）。
- **Don't** 為了塞滿而塞滿；密度服務「旅途中快速查」。
