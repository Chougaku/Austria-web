import { meta, overview } from '../data';
import { CITIES, cityOfArea, matchCity, type CityInfo, type CityKey } from '../data/areas';
import type { Day, Entity, Leg, LegMode, Stay } from '../data/schema';

/** 多城市行程的共用查詢：哪天住哪、哪天換城、城市之間怎麼移動。
    資料全來自總覽.md（住宿／移動），城市座標與順序來自 areas.ts。 */

export const LEG_META: Record<LegMode, { glyph: string; label: string }> = {
  flight: { glyph: '✈', label: '飛機' },
  drive: { glyph: '🚗', label: '自駕' },
  train: { glyph: '🚆', label: '火車' },
  bus: { glyph: '🚌', label: '巴士' },
  ferry: { glyph: '⛴', label: '渡輪' },
  other: { glyph: '→', label: '移動' },
};

/** 每日行程的日期（「06/15 週二」）轉成 YYYY-MM-DD；年份跟著出發日，月份比出發月小代表跨年。 */
export function dayIso(day: Pick<Day, 'date'>, tripStart = meta.tripStart): string | null {
  const m = day.date.match(/^(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const startYear = Number(tripStart.slice(0, 4));
  const month = Number(m[1]);
  const year = month < Number(tripStart.slice(5, 7)) ? startYear + 1 : startYear;
  return `${year}-${String(month).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

/** 某一晚（入住日 ≤ 日期 < 退房日）住哪一段；夜班機那晚回 undefined。 */
export function stayOnNight(iso: string | null, stays: Stay[] = overview.stays): Stay | undefined {
  if (!iso) return undefined;
  return stays.find((s) => s.checkIn <= iso && iso < s.checkOut);
}

export function legsOn(iso: string | null, legs: Leg[] = overview.legs): Leg[] {
  return iso ? legs.filter((l) => l.date === iso) : [];
}

export function stayOfCity(city: CityKey, stays: Stay[] = overview.stays): Stay | undefined {
  return stays.find((s) => matchCity(s.city)?.key === city);
}

/** 依行程順序相鄰兩城之間的移動；總覽沒寫的段落 leg 為 undefined。 */
export function routeSegments(legs: Leg[] = overview.legs): { from: CityInfo; to: CityInfo; leg?: Leg }[] {
  return CITIES.slice(0, -1).map((from, i) => {
    const to = CITIES[i + 1];
    const leg = legs.find((l) => matchCity(l.from)?.key === from.key && matchCity(l.to)?.key === to.key);
    return { from, to, leg };
  });
}

export function entityCity(e: Pick<Entity, 'area'>): CityInfo | undefined {
  return e.area ? cityOfArea(e.area) : undefined;
}

/** 美食庫、景點頁的城市篩選值。 */
export type CityFilter = CityKey | 'all';

export const inCity = (e: Pick<Entity, 'area'>, city: CityFilter) =>
  city === 'all' || entityCity(e)?.key === city;

/** 「2027-06-15」→「6/15」。 */
export const shortDate = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

/** 「2027-06-15」→「15.06.」——郵戳上的歐式日期。 */
export const euroDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;

export const totalNights = (stays: Stay[] = overview.stays) => stays.reduce((n, s) => n + s.nights, 0);

/** 今天是行程的第幾天（用手機本地時間）；不在行程期間回 -1。 */
export function todayIndex(days: Pick<Day, 'date'>[], now = new Date()): number {
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return days.findIndex((d) => dayIso(d) === iso);
}
