import matter from 'gray-matter';
import { OverviewSchema, type Booking, type Leg, type LegMode, type Overview, type Stay } from '../../src/data/schema';
import { stripWikilinks } from './text';

/** 總覽.md 一個 `## 標題` 段落裡的 `- ` 開頭各行（`>` 開頭的格式說明略過）。 */
function sectionLines(content: string, heading: string): string[] {
  const m = content.match(new RegExp(`## ${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |$)`));
  return (m?.[1] ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '))
    .map((l) => stripWikilinks(l.slice(2).trim()));
}

const cells = (line: string) => line.split('｜').map((p) => p.trim());

/** 「06/15」→「2027-06-15」。年份取自出發日；月份比出發月小代表跨年。 */
function toIsoDate(md: string, start: string): string | null {
  const m = md.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const [y, startMonth] = [Number(start.slice(0, 4)), Number(start.slice(5, 7))];
  const month = Number(m[1]);
  const year = month < startMonth ? y + 1 : y;
  return `${year}-${String(month).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

const dayDiff = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

const MODE_WORDS: [LegMode, RegExp][] = [
  ['flight', /飛機|航班|班機|✈/],
  ['drive', /自駕|開車|租車/],
  ['train', /火車|鐵路|列車|railjet|ice/i],
  ['bus', /巴士|公車|客運/],
  ['ferry', /渡輪|遊船|船/],
];

export function legMode(word: string): LegMode {
  return MODE_WORDS.find(([, re]) => re.test(word))?.[0] ?? 'other';
}

function parseStay(line: string, start: string): Stay {
  const [city, range = '', hotel = '', parking = '', note = ''] = cells(line);
  const [inRaw, outRaw] = range.split(/\s*[–—~～-]\s*/);
  const checkIn = inRaw ? toIsoDate(inRaw, start) : null;
  const checkOut = outRaw ? toIsoDate(outRaw, start) : null;
  if (!city || !checkIn || !checkOut) {
    throw new Error(`總覽.md 住宿格式錯誤 →「- ${line}」（應為 - 城市｜06/15–06/18｜飯店或待訂｜停車｜備註）`);
  }
  const nights = dayDiff(checkIn, checkOut);
  if (nights < 1) throw new Error(`總覽.md 住宿日期錯誤 →「- ${line}」（退房要晚於入住）`);
  return {
    city, checkIn, checkOut, nights,
    hotel: hotel === '待訂' ? '' : hotel,
    booked: !!hotel && !hotel.includes('待訂'),
    parking, note,
  };
}

function parseLeg(line: string, start: string): Leg {
  const [dateRaw = '', modeRaw = '', route = '', note = ''] = cells(line);
  const date = toIsoDate(dateRaw, start);
  const [from, to] = route.split(/\s*(?:→|->)\s*/);
  if (!date || !modeRaw || !from || !to) {
    throw new Error(`總覽.md 移動格式錯誤 →「- ${line}」（應為 - 06/18｜自駕｜維也納 → 格拉茨｜備註）`);
  }
  return { date, mode: legMode(modeRaw), from, to, note };
}

function parseBooking(line: string): Booking {
  const [item = '', status = '', detail = ''] = cells(line);
  if (!item) throw new Error(`總覽.md 預訂格式錯誤 →「- ${line}」（應為 - 項目｜狀態｜細節）`);
  return { item, status, detail, done: /已訂|已確認|已購|已買|已付|完成|✅/.test(status) };
}

export function buildOverview(raw: string): Overview {
  const { content } = matter(raw.replace(/\r\n/g, '\n'));
  const fields: Record<string, string> = {};
  for (const line of sectionLines(content, '基本資訊')) {
    const m = line.match(/^(.+?)[：:]\s*(.*)$/);
    if (m) fields[m[1].trim()] = m[2].trim();
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields['出發'] ?? ''))
    throw new Error('總覽.md：「出發」欄位缺少或不是 YYYY-MM-DD');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields['回程'] ?? ''))
    throw new Error('總覽.md：「回程」欄位缺少或不是 YYYY-MM-DD');
  const start = fields['出發'];

  return OverviewSchema.parse({
    fields,
    stays: sectionLines(content, '住宿').map((l) => parseStay(l, start)),
    legs: sectionLines(content, '移動').map((l) => parseLeg(l, start)),
    bookings: sectionLines(content, '預訂').map(parseBooking),
    transportNotes: sectionLines(content, '交通備註'),
  });
}
