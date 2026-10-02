import { entities } from '../data';
import { areaInfo, matchArea } from '../data/areas';
import type { DaySlot, Entity } from '../data/schema';

/** 每日行程的時段類型——用來給時段上色，讓「吃的」與「玩的」一眼分得開。 */
export type SlotKind = 'food' | 'sight' | 'shop' | 'move' | 'stay';

/** shop／move／stay 目前 UI 不呈現（見 MARKED_KINDS），分類能力先留著。 */
export const SLOT_KIND_META: Record<SlotKind, { glyph: string; label: string; color: string }> = {
  food: { glyph: '食', label: '美食', color: 'var(--red)' },
  sight: { glyph: '景', label: '景點', color: 'var(--navy)' },
  shop: { glyph: '買', label: '購物', color: 'var(--brown-dk)' },
  move: { glyph: '移', label: '交通', color: 'var(--brown-dk)' },
  stay: { glyph: '宿', label: '住宿', color: 'var(--brown-dk)' },
};

export type MarkedKind = 'food' | 'sight';

/** UI 只標美食與景點——每列都有記號等於沒有記號，標得越少該找的兩類越跳。同時是圖例來源。 */
export const MARKED_KINDS: MarkedKind[] = ['food', 'sight'];

export const isMarked = (kind: SlotKind | null): kind is MarkedKind =>
  kind === 'food' || kind === 'sight';

const BY_CATEGORY: Partial<Record<Entity['category'], SlotKind>> = {
  餐廳: 'food', 景點: 'sight', 購物: 'shop', 交通: 'move', 住宿: 'stay',
};
// 「區域」刻意不對應：維也納、哈修塔特這種區域名常出現在時段標題裡（「哈修塔特湖畔散步」），
// 比對到區域實體只會蓋掉真正的類型判斷。

const norm = (s: string) => s.toLowerCase().replace(/[\s・･()（）「」【】＆&/／、,.。·\-–—]/g, '');

/** 實體索引，長的排前面——比較長、比較具體的名稱先撞到。 */
const INDEX: { key: string; entity: Entity }[] = entities
  .filter((e) => BY_CATEGORY[e.category])
  .map((e) => ({ key: norm(e.name), entity: e }))
  .filter((x) => x.key.length >= 2)
  .sort((a, b) => b.key.length - a.key.length);

/** 時段標題對應到的實體。完全相同優先於包含，否則「Café Sacher」會被更長的
    「Café Sacher Salzburg」吃掉，區域跟著判錯。 */
export function slotEntity(title: string): Entity | null {
  const t = norm(title);
  if (!t) return null;
  const exact = INDEX.find((x) => x.key === t);
  if (exact) return exact.entity;
  // 雙向包含只在兩邊都夠長時才算，避免兩三個字的實體名亂咬。
  if (t.length < 3) return null;
  return INDEX.find((x) => x.key.length >= 3 && (t.includes(x.key) || x.key.includes(t)))?.entity
    ?? null;
}

/** 標題關鍵字後援：vault 裡沒有對應實體的時段（納許市場、老城夜景散步…）也要有顏色。
    只看標題不看備註——備註常提到「順便買晚餐」這種順帶一提，會誤判。 */
const KEYWORDS: [SlotKind, RegExp][] = [
  ['stay', /check-?in|check-?out|checkin|退房|寄放行李|入住|住宿|飯店|酒店|旅館|民宿/i],
  ['move', /航班|機場|車站|火車|自駕|開車|租車|取車|還車|加油|巴士|渡輪|接駁|轉乘|→|railjet|hbf|bahnhof/i],
  ['shop', /購物|百貨|超市|商場|outlet|伴手禮|紀念品|免稅|藥妝|市集/i],
  ['food', /咖啡|甜點|蛋糕|早餐|午餐|晚餐|宵夜|小吃|美食|餐廳|啤酒|酒館|炸肉排|豬腳|香腸|市場|schnitzel|café|cafe|konditorei|heuriger|beisl|wirtshaus|biergarten|bräu/i],
  ['sight', /散步|夜景|展望|觀景|教堂|宮|城堡|要塞|博物館|美術館|公園|花園|湖|纜車|遊船|健行|步道|老城|舊城|廣場|音樂會|歌劇|小鎮|citywalk|city\s?walk|museum|schloss/i],
];

/** 不是地點的時段（「週日商店公休」這種提醒）不掛地圖連結。 */
const NOT_A_PLACE = /提醒|公休|注意|自由活動/;

/** 判斷時段屬於哪一類；判不出來回 null（維持原本的中性樣式，不亂上色）。 */
export function slotKind(title: string): SlotKind | null {
  const e = slotEntity(title);
  if (e) return BY_CATEGORY[e.category] ?? null;
  for (const [kind, re] of KEYWORDS) if (re.test(title)) return kind;
  return null;
}

/** 時段落在哪一區：先看對應實體的 area，沒有就從標題與備註的地名／地標推。
    標題多半是店名，用取最後一個地名的規則（分店後綴才是所在地）；備註是地址描述，取最前。
    判不出來回空字串——地圖上會歸到「未定位」，不硬掛到某一區。 */
export function slotArea(slot: DaySlot): string {
  if (slot.pending) return '';
  const e = slotEntity(slot.title);
  if (e?.area) return e.area;
  return matchArea(slot.title, slot.note);
}

/** 住宿時段的標題有兩種：「<飯店名> Check-in」與「退房・寄放行李」。
    把動作字樣拿掉後還剩地名的才是地點，只剩動作的搜出來只會是垃圾。 */
const STAY_ACTION = /check\s*-?\s*(?:in|out)|入住|退房|寄放行李|寄行李|住宿/gi;

/** 時段要在 Google 地圖上搜的目標；判不出明確地點就回 null（該列不掛地圖連結）。
    對得到實體時一律以實體的名稱與區域為準——同名分店（Café Sacher 維也納 vs 薩爾茲堡）
    只有這條分得開，用標題硬搜會搜到另一間。 */
export function slotMapTarget(slot: DaySlot): { name: string; area: string } | null {
  if (slot.pending || NOT_A_PLACE.test(`${slot.time}${slot.title}`)) return null;
  // 交通要先擋在實體比對前：「維也納取車」對得到租車這個交通實體，
  // 但這一列講的是移動本身，掛個地圖連結只會誤導。
  const kind = slotKind(slot.title);
  if (kind === 'move') return null;
  const e = slotEntity(slot.title);
  if (e) return { name: e.name, area: e.area };

  const name = kind === 'stay'
    ? slot.title.replace(STAY_ACTION, '').replace(/[\s・･、,／/]+/g, ' ').trim()
    : slot.title;
  // 住宿還沒訂時標題只剩城市名（「格拉茨住宿 Check-in」→「格拉茨」），搜城市沒有意義。
  if (name.length < 2 || areaInfo(name)) return null;
  // 地名的拉丁拼法由 googleMapsUrl 補上，標題已經帶了就不會重複。
  return { name, area: slotArea(slot) };
}
