import { areaInfo } from '../data/areas';

/** 由店名＋區域產生 Google 地圖搜尋連結。已知區域補上它的拉丁地名（「Wien」「Hallstatt」），
    搜尋最準；不認得的區域原樣附上，沒有區域就只搜店名。 */
export function googleMapsUrl(name: string, area?: string): string {
  const where = area ? (areaInfo(area)?.town ?? area) : '';
  const query = name.includes(where) ? name : `${name} ${where}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
