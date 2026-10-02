/** 城市與區域的唯一定義來源：建置期用它把實體歸區（scripts/lib/parse-entity.ts），
    執行期用它畫路線區域列（components/AreaRail.tsx）、真地圖（components/TripMap.tsx）
    與把時段掛到區域上。`AreaInfo.name` 就是 entities.json 的 `area` 值，也是每日行程
    `> 區域：` 的值——三邊要對得起來。 */

export type CityKey = 'wien' | 'graz' | 'ischl' | 'salzburg' | 'innsbruck' | 'muenchen';

export interface CityInfo {
  key: CityKey;
  /** 顯示名，同時也是該城「市中心」那一區的 `AreaInfo.name`。 */
  name: string;
  en: string;
  /** 路線圖郵戳上的拉丁短名。 */
  stamp: string;
  country: 'AT' | 'DE';
  lat: number;
  lng: number;
  /** 住宿所在的區域，不是市中心那一區時才填（鹽湖區住 Bad Ischl）。 */
  base?: string;
}

/** 依行程順序排列：路線區域列、路線圖、地圖連線都照這個順序。 */
export const CITIES: CityInfo[] = [
  { key: 'wien', name: '維也納', en: 'WIEN', stamp: 'WIEN', country: 'AT', lat: 48.2085, lng: 16.3730 },
  { key: 'graz', name: '格拉茨', en: 'GRAZ', stamp: 'GRAZ', country: 'AT', lat: 47.0709, lng: 15.4383 },
  { key: 'ischl', name: '鹽湖區', en: 'SALZKAMMERGUT', stamp: 'BAD ISCHL', country: 'AT', lat: 47.7116, lng: 13.6194, base: '巴德伊舍' },
  { key: 'salzburg', name: '薩爾茲堡', en: 'SALZBURG', stamp: 'SALZBURG', country: 'AT', lat: 47.7990, lng: 13.0450 },
  { key: 'innsbruck', name: '因斯布魯克', en: 'INNSBRUCK', stamp: 'INNSBRUCK', country: 'AT', lat: 47.2687, lng: 11.3932 },
  { key: 'muenchen', name: '慕尼黑', en: 'MÜNCHEN', stamp: 'MÜNCHEN', country: 'DE', lat: 48.1374, lng: 11.5755 },
];

export interface AreaInfo {
  name: string;
  en: string;
  city: CityKey;
  /** true＝這一區就是城市本身（市中心／老城）。比對時城內分區優先，
      地址最後一定寫著城市名（「…, 1130 Wien」），不先看分區的話全部會被歸到市中心。 */
  isCity?: boolean;
  /** 這一區的代表點，顯示在區域列上。 */
  pts: string;
  /** Google 地圖搜尋時補在店名後的地名（拉丁拼法搜得最準）。 */
  town: string;
  badge?: string;
  /** 不在地圖上呈現（實體仍要標得出來）。 */
  offMap?: boolean;
  /** 區域概略座標，多半取該區代表地標或車站，用來在真地圖上放郵戳標記。
      這是「區域」粒度不是「店家」粒度——vault 裡沒有店家座標。 */
  lat: number;
  lng: number;
  /** 比對用別名：中文譯名、德文／英文拼法、地標、郵遞區號。不分大小寫。
      拉丁字母的別名要整個字對上（「wien」不會咬到「Wiener Schnitzel」），中文照子字串比對。 */
  aliases: string[];
}

export const AREAS: AreaInfo[] = [
  // ── 維也納 ──────────────────────────────────────────────────────────
  {
    name: '維也納', en: 'WIEN · INNERE STADT', city: 'wien', isCity: true, town: 'Wien',
    pts: '史蒂芬大教堂・霍夫堡・國家歌劇院・格拉本大街',
    lat: 48.2085, lng: 16.3730, // 史蒂芬廣場
    aliases: ['維也納', 'wien', 'vienna', 'innere stadt', '內城', '1010 wien', 'stephansdom',
      'stephansplatz', '史蒂芬', 'hofburg', '霍夫堡', 'graben', '格拉本', 'kärntner straße',
      'kohlmarkt', 'staatsoper', '國家歌劇院', 'albertina', '阿爾貝蒂娜', 'wien hbf',
      'wien hauptbahnhof', '維也納中央車站'],
  },
  {
    name: '博物館區', en: 'MUSEUMSQUARTIER', city: 'wien', town: 'Wien',
    pts: '藝術史博物館・自然史博物館・MQ・納許市場',
    lat: 48.2035, lng: 16.3592, // MuseumsQuartier
    aliases: ['博物館區', 'museumsquartier', '藝術史博物館', 'kunsthistorisches', '自然史博物館',
      'naturhistorisches', 'naschmarkt', '納許市場', '納旭市場', 'mariahilfer straße',
      '瑪麗亞希爾夫', '1060 wien', '1070 wien', 'spittelberg'],
  },
  {
    name: '美景宮', en: 'BELVEDERE', city: 'wien', town: 'Wien',
    pts: '美景宮・卡爾教堂・百水公寓',
    lat: 48.1915, lng: 16.3809, // 上美景宮
    aliases: ['美景宮', 'belvedere', '卡爾教堂', 'karlskirche', 'karlsplatz', '百水公寓',
      'hundertwasserhaus', 'kunst haus wien', '1030 wien', '1040 wien'],
  },
  {
    name: '美泉宮', en: 'SCHÖNBRUNN', city: 'wien', town: 'Wien',
    pts: '美泉宮・凱旋門 Gloriette・美泉宮動物園',
    lat: 48.1849, lng: 16.3122, // 美泉宮
    aliases: ['美泉宮', '熊布朗', 'schönbrunn', 'schoenbrunn', 'schönbrunner', 'gloriette',
      'hietzing', '1130 wien', 'tiergarten schönbrunn'],
  },
  {
    name: '普拉特', en: 'PRATER', city: 'wien', town: 'Wien',
    pts: '普拉特摩天輪・多瑙運河・卡美利特市場',
    lat: 48.2166, lng: 16.3958, // 摩天輪
    aliases: ['普拉特', 'prater', 'riesenrad', '摩天輪', 'leopoldstadt', 'praterstern',
      '1020 wien', 'karmelitermarkt'],
  },
  {
    name: '格林津', en: 'GRINZING', city: 'wien', town: 'Wien',
    pts: '新酒館 Heuriger・葡萄園・卡倫山',
    lat: 48.2575, lng: 16.3497, // 格林津
    aliases: ['格林津', 'grinzing', 'kahlenberg', '卡倫山', '1190 wien', 'nussdorf'],
  },
  {
    name: '維也納機場', en: 'FLUGHAFEN WIEN', city: 'wien', town: 'Flughafen Wien',
    pts: '入境・機場快線／S7／Railjet 進市區',
    lat: 48.1103, lng: 16.5697,
    aliases: ['維也納機場', 'flughafen wien', 'vienna airport', 'vienna international airport',
      'schwechat'],
  },

  // ── 格拉茨 ──────────────────────────────────────────────────────────
  {
    name: '格拉茨', en: 'GRAZ · ALTSTADT', city: 'graz', isCity: true, town: 'Graz',
    pts: '主廣場・穆爾島・美術館 Kunsthaus・老城',
    lat: 47.0709, lng: 15.4383, // 主廣場
    aliases: ['格拉茨', '格拉茲', 'graz', 'murinsel', '穆爾島', 'kunsthaus graz', 'graz hbf',
      '8010 graz'],
  },
  {
    name: '城堡山', en: 'SCHLOSSBERG', city: 'graz', town: 'Graz',
    pts: '鐘塔・城堡山纜車',
    lat: 47.0763, lng: 15.4377,
    aliases: ['城堡山', 'schlossberg', '鐘塔', 'uhrturm', 'schlossbergbahn'],
  },
  {
    name: '埃根堡宮', en: 'SCHLOSS EGGENBERG', city: 'graz', town: 'Graz',
    pts: '世界遺產宮殿・孔雀花園',
    lat: 47.0739, lng: 15.3907,
    aliases: ['埃根堡', 'eggenberg'],
  },

  // ── 鹽湖區（住 Bad Ischl）──────────────────────────────────────────
  {
    name: '鹽湖區', en: 'SALZKAMMERGUT', city: 'ischl', isCity: true, town: 'Salzkammergut',
    pts: '沃夫岡湖・哈修塔特湖・特勞恩湖',
    lat: 47.7116, lng: 13.6194, // 以 Bad Ischl 為中心
    aliases: ['鹽湖區', '鹽湖', '薩爾茨卡默古特', 'salzkammergut', 'wolfgangsee', '沃夫岡湖'],
  },
  {
    name: '巴德伊舍', en: 'BAD ISCHL', city: 'ischl', town: 'Bad Ischl',
    pts: '皇帝別墅・Zauner 甜點・溫泉',
    lat: 47.7116, lng: 13.6194,
    aliases: ['巴德伊舍', '伊舍', 'bad ischl', 'ischl', 'kaiservilla', '皇帝別墅', 'zauner'],
  },
  {
    name: '哈修塔特', en: 'HALLSTATT', city: 'ischl', town: 'Hallstatt',
    pts: '湖畔小鎮・鹽礦・世界遺產觀景台',
    lat: 47.5622, lng: 13.6493,
    aliases: ['哈修塔特', '哈爾施塔特', '哈斯達特', 'hallstatt', 'hallstätter see'],
  },
  {
    name: '聖沃夫岡', en: 'ST. WOLFGANG', city: 'ischl', town: 'St. Wolfgang im Salzkammergut',
    pts: '沃夫岡湖畔・夏夫堡登山齒軌火車',
    lat: 47.7389, lng: 13.4475,
    aliases: ['聖沃夫岡', '聖沃爾夫岡', 'st. wolfgang', 'st wolfgang', 'sankt wolfgang',
      'schafberg', '夏夫堡', 'schafbergbahn'],
  },
  {
    name: '聖吉爾根', en: 'ST. GILGEN', city: 'ischl', town: 'St. Gilgen',
    pts: '沃夫岡湖西岸・Zwölferhorn 纜車',
    lat: 47.7667, lng: 13.3656,
    aliases: ['聖吉爾根', 'st. gilgen', 'st gilgen', 'sankt gilgen', 'zwölferhorn'],
  },
  {
    name: '格蒙登', en: 'GMUNDEN', city: 'ischl', town: 'Gmunden',
    pts: '特勞恩湖・湖上城堡 Schloss Ort・陶瓷',
    lat: 47.9186, lng: 13.7994,
    aliases: ['格蒙登', 'gmunden', 'traunsee', '特勞恩湖', 'schloss ort'],
  },
  {
    name: '達赫斯坦', en: 'DACHSTEIN', city: 'ischl', town: 'Obertraun',
    pts: '五指觀景台・冰洞・Krippenstein 纜車',
    lat: 47.5570, lng: 13.6920, // Obertraun 纜車站
    aliases: ['達赫斯坦', 'dachstein', 'obertraun', 'krippenstein', '5fingers', 'five fingers',
      '五指觀景台'],
  },

  // ── 薩爾茲堡 ────────────────────────────────────────────────────────
  {
    name: '薩爾茲堡', en: 'SALZBURG · ALTSTADT', city: 'salzburg', isCity: true, town: 'Salzburg',
    pts: '糧食胡同・莫札特出生地・主教座堂・老城',
    lat: 47.7990, lng: 13.0450, // 老城
    aliases: ['薩爾茲堡', '薩爾斯堡', '莎姿堡', 'salzburg', 'getreidegasse', '糧食胡同', '糧食街',
      'mozarts geburtshaus', '莫札特出生地', 'residenzplatz', 'salzburger dom', 'salzburg hbf',
      '5020 salzburg'],
  },
  {
    name: '城堡要塞', en: 'HOHENSALZBURG', city: 'salzburg', town: 'Salzburg',
    pts: '薩爾茲堡要塞・要塞纜車',
    lat: 47.7949, lng: 13.0477,
    aliases: ['城堡要塞', '要塞', 'hohensalzburg', 'festungsbahn'],
  },
  {
    name: '米拉貝爾', en: 'MIRABELL', city: 'salzburg', town: 'Salzburg',
    pts: '米拉貝爾宮與花園・新城區',
    lat: 47.8058, lng: 13.0419,
    aliases: ['米拉貝爾', 'mirabell', 'mirabellplatz', 'mirabellgarten', 'makartplatz', 'linzer gasse'],
  },
  {
    name: '海布倫', en: 'HELLBRUNN', city: 'salzburg', town: 'Salzburg',
    pts: '海布倫宮・惡作劇噴泉',
    lat: 47.7632, lng: 13.0607,
    aliases: ['海布倫', '海爾布倫', 'hellbrunn', 'wasserspiele', '惡作劇噴泉'],
  },
  {
    name: '國王湖', en: 'KÖNIGSSEE', city: 'salzburg', town: 'Schönau am Königssee',
    pts: '德國貝希特斯加登・國王湖遊船・鷹巢',
    lat: 47.5932, lng: 12.9876,
    aliases: ['國王湖', 'königssee', 'koenigssee', 'berchtesgaden', '貝希特斯加登', 'kehlsteinhaus',
      '鷹巢'],
  },

  // ── 因斯布魯克 ──────────────────────────────────────────────────────
  {
    name: '因斯布魯克', en: 'INNSBRUCK · ALTSTADT', city: 'innsbruck', isCity: true, town: 'Innsbruck',
    pts: '黃金屋頂・瑪麗亞特蕾莎大街・老城',
    lat: 47.2687, lng: 11.3932, // 黃金屋頂
    aliases: ['因斯布魯克', '茵斯布魯克', '印斯布魯克', 'innsbruck', 'goldenes dachl', '黃金屋頂',
      'maria-theresien-straße', '瑪麗亞特蕾莎', 'herzog-friedrich-straße', 'innsbruck hbf',
      '6020 innsbruck'],
  },
  {
    name: '北山', en: 'NORDKETTE', city: 'innsbruck', town: 'Innsbruck',
    pts: '北山纜車・Seegrube・Hafelekar',
    lat: 47.3061, lng: 11.3797, // Seegrube
    aliases: ['北山', 'nordkette', 'nordkettenbahn', 'hungerburg', 'seegrube', 'hafelekar'],
  },
  {
    name: '水晶世界', en: 'SWAROVSKI KRISTALLWELTEN', city: 'innsbruck', town: 'Wattens',
    pts: '施華洛世奇水晶世界（Wattens）',
    lat: 47.2943, lng: 11.6006,
    aliases: ['水晶世界', '施華洛世奇', 'swarovski', 'kristallwelten', 'wattens'],
  },
  {
    name: '伯吉瑟爾', en: 'BERGISEL', city: 'innsbruck', town: 'Innsbruck',
    pts: '跳台滑雪場・俯瞰市區',
    lat: 47.2489, lng: 11.3995,
    aliases: ['伯吉瑟爾', 'bergisel'],
  },

  // ── 慕尼黑 ──────────────────────────────────────────────────────────
  {
    name: '慕尼黑', en: 'MÜNCHEN · ALTSTADT', city: 'muenchen', isCity: true, town: 'München',
    pts: '瑪麗恩廣場・新市政廳・聖母教堂・穀物市場',
    lat: 48.1374, lng: 11.5755, // 瑪麗恩廣場
    aliases: ['慕尼黑', 'münchen', 'muenchen', 'munich', 'marienplatz', '瑪麗恩廣場', '新市政廳',
      'neues rathaus', 'frauenkirche', '聖母教堂', 'viktualienmarkt', '穀物市場', 'hofbräuhaus',
      '皇家啤酒屋', 'odeonsplatz', 'residenz münchen', '慕尼黑王宮', 'münchen hbf',
      '慕尼黑中央車站'],
  },
  {
    name: '藝術區', en: 'MAXVORSTADT', city: 'muenchen', town: 'München',
    pts: '新舊美術館・國王廣場・大學區',
    lat: 48.1486, lng: 11.5700,
    aliases: ['藝術區', 'maxvorstadt', 'alte pinakothek', 'neue pinakothek', 'pinakothek',
      '美術館區', '國王廣場', 'königsplatz'],
  },
  {
    name: '英國花園', en: 'ENGLISCHER GARTEN', city: 'muenchen', town: 'München',
    pts: '英國花園・河道衝浪・中國塔啤酒花園',
    lat: 48.1642, lng: 11.6056,
    aliases: ['英國花園', 'englischer garten', 'eisbach', 'chinesischer turm', '中國塔', 'schwabing',
      '施瓦賓', 'münchner freiheit'],
  },
  {
    name: '寧芬堡', en: 'NYMPHENBURG', city: 'muenchen', town: 'München',
    pts: '寧芬堡宮・皇家花園',
    lat: 48.1583, lng: 11.5033,
    aliases: ['寧芬堡', 'nymphenburg'],
  },
  {
    name: '奧林匹克', en: 'OLYMPIAPARK', city: 'muenchen', town: 'München',
    pts: '奧林匹克公園・BMW 世界與博物館',
    lat: 48.1755, lng: 11.5518,
    aliases: ['奧林匹克', 'olympiapark', 'bmw welt', 'bmw museum', 'bmw 博物館'],
  },
  {
    name: '新天鵝堡', en: 'NEUSCHWANSTEIN', city: 'muenchen', town: 'Schwangau',
    pts: '新天鵝堡・高天鵝堡（一日遊）',
    lat: 47.5576, lng: 10.7498,
    aliases: ['新天鵝堡', 'neuschwanstein', 'hohenschwangau', '高天鵝堡', 'schwangau', 'füssen'],
  },
  {
    name: '慕尼黑機場', en: 'FLUGHAFEN MÜNCHEN', city: 'muenchen', town: 'Flughafen München',
    pts: '回程・S1／S8 進出市區',
    lat: 48.3538, lng: 11.7861,
    aliases: ['慕尼黑機場', 'flughafen münchen', 'munich airport'],
  },
];

export const AREA_NAMES = AREAS.map((a) => a.name);
export const MAP_AREAS = AREAS.filter((a) => !a.offMap);

const AREA_BY_NAME = new Map(AREAS.map((a) => [a.name, a]));
const CITY_BY_KEY = new Map(CITIES.map((c) => [c.key, c]));

export const areaInfo = (name: string): AreaInfo | undefined => AREA_BY_NAME.get(name);
export const cityInfo = (key: CityKey): CityInfo => CITY_BY_KEY.get(key)!;

/** 區域（正名）所屬城市；不是已知區域回 undefined。 */
export function cityOfArea(area: string): CityInfo | undefined {
  const a = AREA_BY_NAME.get(area);
  return a ? CITY_BY_KEY.get(a.city) : undefined;
}

/** 任意文字（「維也納」「Bad Ischl」「München Hbf」）對應到哪座城市。 */
export function matchCity(text: string): CityInfo | undefined {
  return cityOfArea(matchArea(text));
}

/** 依來源順序找區域：先給明確的位置欄位，再退到店名、備註、標籤。
    先命中的來源直接勝出——店名裡的「Wien」不該蓋掉位置欄寫的「Hallstatt」。 */
export function matchArea(...sources: string[]): string {
  for (const src of sources) {
    const hit = pick(src);
    if (hit) return hit;
  }
  return '';
}

const DISTRICTS = AREAS.filter((a) => !a.isCity);
const CITY_AREAS = AREAS.filter((a) => a.isCity);

/** 同一段文字先找城內分區，找不到才退回城市本身：
    「Schönbrunner Schloßstraße 47, 1130 Wien」是美泉宮，不是維也納市中心。 */
function pick(src: string): string {
  if (!src) return '';
  const hay = src.toLowerCase();
  return best(hay, DISTRICTS) || best(hay, CITY_AREAS);
}

/** 一段文字裡取**最後**出現的地名：分店後綴、地址的市鎮都寫在後面
    （「Café Sacher Salzburg」在薩爾茲堡）。結尾位置相同時取較長的別名。 */
function best(hay: string, pool: AreaInfo[]): string {
  let name = '';
  let bestEnd = -1;
  let bestLen = 0;
  for (const area of pool) {
    for (const alias of area.aliases) {
      const at = lastIndexOfAlias(hay, alias.toLowerCase());
      if (at < 0) continue;
      const end = at + alias.length;
      if (end > bestEnd || (end === bestEnd && alias.length > bestLen)) {
        name = area.name;
        bestEnd = end;
        bestLen = alias.length;
      }
    }
  }
  return name;
}

const LATIN = /^[\x20-\x7eÀ-ɏ]+$/;
const WORD_CHAR = /[a-z0-9À-ɏ]/;

/** 中文別名照子字串找；拉丁別名要前後都不是字母數字才算，
    否則「wien」會咬到「Wiener Schnitzel」、「ischl」會咬到別的字裡。 */
function lastIndexOfAlias(hay: string, alias: string): number {
  if (!LATIN.test(alias)) return hay.lastIndexOf(alias);
  let at = hay.lastIndexOf(alias);
  while (at >= 0) {
    const before = at > 0 ? hay[at - 1] : '';
    const after = hay[at + alias.length] ?? '';
    if (!WORD_CHAR.test(before) && !WORD_CHAR.test(after)) return at;
    at = at > 0 ? hay.lastIndexOf(alias, at - 1) : -1;
  }
  return -1;
}
