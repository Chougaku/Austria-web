// 從儀表板新增景點／購物：驗證前端送來的欄位，產生跟 vault 範例檔同格式的 markdown。
// 格式要讓 scripts/lib/parse-entity.ts 讀得懂：frontmatter 的 title、`## 基本資訊` 底下的「- 欄位：值」。

/** 網站上能新增的分類；餐廳、交通等其他分類還是直接在 vault 寫。 */
export const ADDABLE = ['景點', '購物'] as const;
export type AddableCategory = (typeof ADDABLE)[number];

export interface NewEntity {
  category: AddableCategory;
  name: string;
  /** 類型（宮殿、伴手禮…） */
  type: string;
  /** 城市名，寫進標籤。 */
  city: string;
  /** 位置欄：「城市 / 區域」，建置時靠它把地點歸區。 */
  location: string;
  address: string;
  /** 門票，只有景點有。 */
  ticket: string;
  /** 一段簡介，卡片上顯示的那段。 */
  summary: string;
}

const LIMITS: [keyof NewEntity, string, number][] = [
  ['name', '名稱', 80], ['type', '類型', 40], ['city', '城市', 20], ['location', '位置', 60],
  ['address', '地址', 160], ['ticket', '門票', 80], ['summary', '簡介', 600],
];

/** 一律收成單行：換行會讓「- 欄位：值」斷掉，簡介裡的換行也可能長出新的 `## ` 段落。 */
const oneLine = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

/** 檔名：拿掉檔案系統與 Obsidian 連結不能用的字元。 */
export function fileName(name: string): string {
  return name.replace(/[\\/:*?"<>|#^[\]]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '').slice(0, 60).trim();
}

/** 驗證請求內容；不合格回一句給人看的原因。 */
export function parseNewEntity(body: unknown): NewEntity | string {
  if (!body || typeof body !== 'object') return '資料格式不對';
  const b = body as Record<string, unknown>;
  if (!ADDABLE.includes(b.category as AddableCategory)) return '只能新增景點或購物';
  const category = b.category as AddableCategory;
  const e: NewEntity = {
    category,
    name: oneLine(b.name),
    type: oneLine(b.type),
    city: oneLine(b.city),
    location: oneLine(b.location),
    address: oneLine(b.address),
    ticket: category === '景點' ? oneLine(b.ticket) : '',
    summary: oneLine(b.summary),
  };
  if (!e.name) return '請填名稱';
  for (const [key, label, max] of LIMITS) if (e[key].length > max) return `${label}太長（最多 ${max} 字）`;
  if (!fileName(e.name)) return '名稱不能只有符號';
  return e;
}

/** 跟 vault 的範例檔（wiki/entities/景點/美泉宮.md）同一個格式。 */
export function entityMarkdown(e: NewEntity, today: string): string {
  const info = ([['類型', e.type], ['地址', e.address], ['位置', e.location], ['門票', e.ticket]] as const)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}：${v}`);
  // 開頭是 # 的話解析器會當成標題，簡介就不見了
  const summary = e.summary.replace(/^#+\s*/, '');
  return [
    '---',
    // JSON 字串也是合法的 YAML 雙引號字串：名稱裡有冒號、引號都不會壞
    `title: ${JSON.stringify(e.name)}`,
    `tags: ${JSON.stringify([e.category, e.city].filter(Boolean))}`,
    `updated: ${today}`,
    '---',
    '',
    ...(summary ? [summary, ''] : []),
    '## 基本資訊',
    ...info,
    '',
    '## 來源',
    '- 從儀表板新增',
    '',
  ].join('\n');
}
