import { describe, it, expect } from 'vitest';
import { AREAS, AREA_NAMES, CITIES, MAP_AREAS, cityOfArea, matchArea, matchCity } from '../areas';
import { entities, days, overview } from '..';

describe('城市與區域定義', () => {
  it('正名不重複、每區都有別名', () => {
    expect(new Set(AREA_NAMES).size).toBe(AREAS.length);
    for (const a of AREAS) expect(a.aliases.length).toBeGreaterThan(0);
  });

  it('正名自己一定比對得到自己，別名不跨區重複', () => {
    const seen = new Map<string, string>();
    for (const a of AREAS) {
      expect(matchArea(a.name)).toBe(a.name);
      for (const alias of a.aliases) {
        const key = alias.toLowerCase();
        expect(seen.get(key) ?? a.name).toBe(a.name);
        seen.set(key, a.name);
      }
    }
  });

  it('每座城市剛好有一個「市中心」區域，名稱就是城市名', () => {
    for (const c of CITIES) {
      const centres = AREAS.filter((a) => a.city === c.key && a.isCity);
      expect(centres.map((a) => a.name)).toEqual([c.name]);
    }
  });

  it('每個區域都掛在已定義的城市上', () => {
    const keys = new Set(CITIES.map((c) => c.key));
    for (const a of AREAS) expect(keys.has(a.city)).toBe(true);
  });
});

/** 這幾邊是同一組字串：實體的 area、每日行程的 areas、總覽的住宿與移動、地圖區域列。
    任何一邊加了新地名而沒進 AREAS，地圖就會默默漏掉，所以在這裡卡住。 */
describe('資料與區域定義對得起來', () => {
  it('每日行程的 areas 都是地圖上找得到的區域', () => {
    const onMap = new Set(MAP_AREAS.map((a) => a.name));
    const missing = days.flatMap((d) => d.areas).filter((a) => !onMap.has(a));
    expect(missing).toEqual([]);
  });

  it('實體的 area 都是已定義的正名（空字串代表 vault 沒寫位置，允許）', () => {
    const known = new Set(AREA_NAMES);
    const bad = entities.map((e) => e.area).filter((a) => a && !known.has(a));
    expect(Array.from(new Set(bad))).toEqual([]);
  });

  it('總覽每段住宿都對得到城市', () => {
    const bad = overview.stays.filter((s) => !matchCity(s.city)).map((s) => s.city);
    expect(bad).toEqual([]);
  });
});

describe('matchArea', () => {
  it('認得中文譯名、德文拼法與地標', () => {
    expect(matchArea('Stephansplatz 3')).toBe('維也納');
    expect(matchArea('Mirabellplatz 4, Salzburg')).toBe('米拉貝爾');
    expect(matchArea('國王湖遊船')).toBe('國王湖');
  });
  it('先給的來源優先', () => {
    expect(matchArea('', '格拉茨城堡山', 'Wien')).toBe('城堡山');
  });
  it('找不到回空字串', () => {
    expect(matchArea('Linz')).toBe('');
  });
});

describe('matchCity / cityOfArea', () => {
  it('區域歸到所屬城市', () => {
    expect(cityOfArea('哈修塔特')?.key).toBe('ischl');
    expect(cityOfArea('新天鵝堡')?.key).toBe('muenchen');
    expect(cityOfArea('不存在')).toBeUndefined();
  });
  it('任意文字對應城市', () => {
    expect(matchCity('Bad Ischl')?.name).toBe('鹽湖區');
    expect(matchCity('München Hbf')?.name).toBe('慕尼黑');
    expect(matchCity('台灣')).toBeUndefined();
  });
});
