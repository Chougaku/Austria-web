import { describe, it, expect } from 'vitest';
import { stripWikilinks, extractArea, todoKey } from '../text';

describe('stripWikilinks', () => {
  it('別名連結取別名', () => {
    expect(stripWikilinks('去 [[維也納|Wien]] 逛')).toBe('去 Wien 逛');
  });
  it('一般連結取最後路徑段', () => {
    expect(stripWikilinks('[[原始資料/景點/美泉宮]]方向')).toBe('美泉宮方向');
    expect(stripWikilinks('[[Café Sacher]] 2F')).toBe('Café Sacher 2F');
  });
  it('無連結原樣返回', () => {
    expect(stripWikilinks('普通文字')).toBe('普通文字');
  });
});

describe('extractArea', () => {
  it('從地址找到城市', () => {
    expect(extractArea('Philharmoniker Str. 4, 1010 Wien')).toBe('維也納');
    expect(extractArea('Getreidegasse 9, 5020 Salzburg')).toBe('薩爾茲堡');
    expect(extractArea('慕尼黑 / 瑪麗恩廣場')).toBe('慕尼黑');
  });
  it('城內分區優先於城市本身——地址最後一定寫城市名', () => {
    expect(extractArea('Schönbrunner Schloßstraße 47, 1130 Wien')).toBe('美泉宮');
    expect(extractArea('Prinz-Eugen-Straße 27, 1030 Wien')).toBe('美景宮');
    expect(extractArea('Wien Hbf 旁，步行到美景宮')).toBe('美景宮');
  });
  it('認得德文拼法與地標', () => {
    expect(extractArea('Seegrube（北山纜車中站）')).toBe('北山');
    expect(extractArea('Hofbräuhaus am Platzl')).toBe('慕尼黑');
    expect(extractArea('Kaiservilla, Bad Ischl')).toBe('巴德伊舍');
    expect(extractArea('Seestraße 104, 4830 Hallstatt')).toBe('哈修塔特');
  });
  it('拉丁別名要整個字對上——Wiener Schnitzel 不是維也納', () => {
    expect(extractArea('Wiener Schnitzel 專賣')).toBe('');
    expect(extractArea('Salzburger Nockerl')).toBe('');
  });
  it('先給的來源優先——店名的 Wien 不該蓋掉位置欄的哈修塔特', () => {
    expect(extractArea('哈修塔特湖畔', 'Café Wien')).toBe('哈修塔特');
  });
  it('同一層級取最後面的地名——分店、市鎮都寫在後面', () => {
    expect(extractArea('Graz 或 Innsbruck')).toBe('因斯布魯克');
    expect(extractArea('Café Sacher Salzburg')).toBe('薩爾茲堡');
  });
  it('找不到回空字串', () => {
    expect(extractArea('Linz')).toBe('');
    expect(extractArea('', '', '')).toBe('');
  });
});

describe('todoKey', () => {
  it('同文字同 key、不同文字不同 key', () => {
    const a = todoKey('訂機票');
    expect(a).toMatch(/^todo:[0-9a-f]+$/);
    expect(todoKey('訂機票')).toBe(a);
    expect(todoKey('訂火車票')).not.toBe(a);
  });
});
