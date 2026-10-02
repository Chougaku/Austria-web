import { describe, it, expect, vi } from 'vitest';
import type { Entity } from '../../data/schema';

const ent = (id: string, category: Entity['category'], name: string, area: string): Entity => ({
  id, category, name, area, tags: [], updated: '', favorite: false, fields: {}, summary: '', body: '', rating: null,
});

vi.mock('../../data', () => ({
  entities: [
    ent('餐廳/a', '餐廳', 'Café Sacher', '維也納'),
    ent('餐廳/b', '餐廳', 'Café Sacher Salzburg', '薩爾茲堡'),
    ent('景點/a', '景點', '美泉宮 Schloss Schönbrunn', '美泉宮'),
    ent('購物/a', '購物', 'Manner 史蒂芬廣場店', '維也納'),
    ent('交通/a', '交通', '租車・維也納取車 → 因斯布魯克還車', '因斯布魯克'),
    ent('區域/a', '區域', '哈修塔特', '哈修塔特'),
  ],
}));

const { slotKind, slotArea, slotEntity, slotMapTarget } = await import('../slot-kind');

const slot = (title: string, note = '') => ({ time: '下午', title, note, pending: false });

describe('slotKind', () => {
  it('比對得到實體名就用實體的分類', () => {
    expect(slotKind('Café Sacher')).toBe('food');
    expect(slotKind('Manner 史蒂芬廣場店')).toBe('shop');
  });

  it('標題是實體名的一部分（或反過來）也算', () => {
    expect(slotKind('美泉宮')).toBe('sight'); // 實體是「美泉宮 Schloss Schönbrunn」
    expect(slotKind('維也納取車')).toBe('move'); // 實體是租車那一頁
  });

  it('沒有對應實體時用標題關鍵字後援', () => {
    expect(slotKind('納許市場早餐')).toBe('food');
    expect(slotKind('Hofbräuhaus 啤酒屋')).toBe('food');
    expect(slotKind('老城夜景散步')).toBe('sight');
    expect(slotKind('Billa 超市補給')).toBe('shop');
    expect(slotKind('格拉茨 → 巴德伊舍')).toBe('move');
    expect(slotKind('格拉茨住宿 Check-in')).toBe('stay');
  });

  it('區域實體不會蓋掉關鍵字判斷', () => {
    expect(slotKind('哈修塔特湖畔散步')).toBe('sight');
  });

  it('判不出來就回 null，不亂上色', () => {
    expect(slotKind('週日商店公休')).toBeNull();
    expect(slotKind('')).toBeNull();
  });

  it('完全同名優先於包含——不會被更長的分店名吃掉', () => {
    // 撞錯的話區域會從維也納跑到薩爾茲堡。
    expect(slotEntity('Café Sacher')?.area).toBe('維也納');
  });
});

describe('slotArea', () => {
  it('有對應實體就用實體的區域', () => {
    expect(slotArea(slot('Café Sacher Salzburg'))).toBe('薩爾茲堡');
  });

  it('實體對不到時，從備註裡的地標推', () => {
    expect(slotArea(slot('午餐', 'Naschmarkt 攤位隨便吃'))).toBe('博物館區');
  });

  it('沒有實體時看標題的地名', () => {
    expect(slotArea(slot('哈修塔特湖畔散步'))).toBe('哈修塔特');
  });

  it('待安排與判不出來的都回空字串（地圖上歸「未定位」）', () => {
    expect(slotArea({ time: '下午', title: '待安排', note: '', pending: true })).toBe('');
    expect(slotArea(slot('退房・寄放行李'))).toBe('');
  });
});

describe('slotMapTarget', () => {
  it('對得到實體就用實體的名稱與區域——分店才不會搜到別間', () => {
    expect(slotMapTarget(slot('Café Sacher', '原創薩赫蛋糕'))).toEqual({ name: 'Café Sacher', area: '維也納' });
  });

  it('沒有實體時用標題本身，區域從標題／備註推', () => {
    expect(slotMapTarget(slot('納許市場早餐'))).toEqual({ name: '納許市場早餐', area: '博物館區' });
  });

  it('交通時段講的是移動本身，沒有單一地點可搜', () => {
    expect(slotMapTarget(slot('格拉茨 → 巴德伊舍', '自駕 2.5 小時'))).toBeNull();
    expect(slotMapTarget(slot('維也納取車'))).toBeNull();
  });

  it('住宿時段去掉 Check-in 這類動作字樣後，剩飯店名的才給連結', () => {
    expect(slotMapTarget(slot('Hotel Sacher Check-in'))).toEqual({ name: 'Hotel Sacher', area: '' });
    expect(slotMapTarget(slot('退房・寄放行李', '11:00 前離開'))).toBeNull();
  });

  it('住宿還沒訂、只剩城市名時不給連結', () => {
    expect(slotMapTarget(slot('格拉茨住宿 Check-in', '確認停車位'))).toBeNull();
  });

  it('提醒與待安排的時段不給連結', () => {
    expect(slotMapTarget({ time: '提醒', title: '週日商店公休', note: '', pending: false })).toBeNull();
    expect(slotMapTarget({ time: '下午', title: '待安排', note: '', pending: true })).toBeNull();
  });
});
