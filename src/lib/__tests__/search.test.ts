import { describe, it, expect, vi } from 'vitest';
import {
  tokenize, matchesTokens, scoreEntity, suggestFoodTypes, makeSegments, makeSnippet, rankEntities,
} from '../search';
import type { Entity } from '../../data/schema';

vi.mock('../../data', () => ({
  entities: [
    { id: 'r1', category: '餐廳', name: 'Figlmüller', tags: [], updated: '', favorite: false,
      fields: { 類型: '炸肉排' }, summary: '', body: '', area: '', rating: 4.4 },
    { id: 'r2', category: '餐廳', name: '花',  tags: [], updated: '', favorite: false,
      fields: { 類型: '炸肉排' }, summary: '', body: '', area: '', rating: 4.1 },
    { id: 'r3', category: '餐廳', name: '鳥貴族', tags: [], updated: '', favorite: false,
      fields: { 類型: '日式串燒' }, summary: '', body: '', area: '', rating: 3.9 },
    { id: 'r4', category: '餐廳', name: '無類型店', tags: [], updated: '', favorite: false,
      fields: {}, summary: '', body: '', area: '', rating: null },
    { id: 'p1', category: '景點', name: '美泉宮', tags: [], updated: '', favorite: false,
      fields: { 類型: '炸肉排' }, summary: '', body: '', area: '', rating: null },
  ],
}));

function ent(over: Partial<Entity>): Entity {
  return {
    id: 'x', category: '餐廳', name: '', tags: [], updated: '', favorite: false,
    fields: {}, summary: '', body: '', area: '', rating: null, ...over,
  };
}

describe('tokenize', () => {
  it('半形與全形空白分詞並小寫化', () => {
    expect(tokenize('格拉本　Ramen 咖啡')).toEqual(['格拉本', 'ramen', '咖啡']);
  });
  it('空字串與全空白回空陣列', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('  　 ')).toEqual([]);
  });
});

describe('matchesTokens', () => {
  it('AND：全部命中才 true', () => {
    expect(matchesTokens('格拉本的Demel咖啡', ['格拉本', '咖啡'])).toBe(true);
    expect(matchesTokens('格拉本的Demel咖啡', ['格拉本', '豬腳'])).toBe(false);
  });
  it('大小寫不敏感', () => {
    expect(matchesTokens('ICOCA 卡', ['icoca'])).toBe(true);
  });
});

describe('scoreEntity', () => {
  it('名稱命中權重最高', () => {
    const byName = scoreEntity(ent({ name: 'Demel咖啡' }), ['咖啡']);
    const bySummary = scoreEntity(ent({ summary: '咖啡名店' }), ['咖啡']);
    const byField = scoreEntity(ent({ fields: { 類型: '咖啡' } }), ['咖啡']);
    expect(byName).toBe(100);
    expect(bySummary).toBe(30);
    expect(byField).toBe(20);
    expect(byName).toBeGreaterThan(bySummary);
    expect(bySummary).toBeGreaterThan(byField);
  });
  it('多 token 分數加總', () => {
    const e = ent({ name: 'Demel咖啡', area: '格拉本' });
    expect(scoreEntity(e, ['咖啡', '格拉本'])).toBe(150);
  });
  it('任一 token 未命中回 0', () => {
    expect(scoreEntity(ent({ name: 'Demel咖啡' }), ['咖啡', '豬腳'])).toBe(0);
  });
  it('特殊字元不會炸', () => {
    expect(scoreEntity(ent({ name: 'a(b)c' }), ['(b)'])).toBe(100);
  });
});

describe('suggestFoodTypes', () => {
  it('子字串命中類型並計數、依數量排序', () => {
    expect(suggestFoodTypes('炸肉')).toEqual([{ type: '炸肉排', count: 2 }]);
  });
  it('多類型命中時依 count 降冪', () => {
    expect(suggestFoodTypes('煮 串')).toEqual([]); // AND：沒有類型同時含「煮」「串」
    expect(suggestFoodTypes('日式')).toEqual([{ type: '日式串燒', count: 1 }]);
  });
  it('只算餐廳分類', () => {
    // p1 是景點但類型也是炸肉排，不能算進 count
    expect(suggestFoodTypes('炸肉排')[0].count).toBe(2);
  });
  it('空查詢回空陣列', () => {
    expect(suggestFoodTypes('  ')).toEqual([]);
  });
});

describe('makeSegments', () => {
  it('命中片段標 hit，其餘不標', () => {
    expect(makeSegments('格拉本咖啡店', ['咖啡'])).toEqual([
      { text: '格拉本', hit: false },
      { text: '咖啡', hit: true },
      { text: '店', hit: false },
    ]);
  });
  it('多 token 與重疊範圍合併', () => {
    expect(makeSegments('AABBA', ['aab', 'bb'])).toEqual([
      { text: 'AABB', hit: true },
      { text: 'A', hit: false },
    ]);
  });
  it('無命中回單一非 hit 片段', () => {
    expect(makeSegments('美泉宮', ['咖啡'])).toEqual([{ text: '美泉宮', hit: false }]);
  });
  it('空 tokens 回單一非 hit 片段', () => {
    expect(makeSegments('美泉宮', [])).toEqual([{ text: '美泉宮', hit: false }]);
  });
});

describe('rankEntities', () => {
  const pool = [
    ent({ id: 'a', name: 'Demel咖啡', area: '維也納' }),
    ent({ id: 'b', name: 'Sperl咖啡', area: '薩爾茲堡' }),
    ent({ id: 'c', name: '美泉宮', area: '美泉宮' }),
  ];
  it('無查詢時，已標記的排最前面', () => {
    const favIds = new Set(['c']);
    const result = rankEntities('', favIds, pool);
    expect(result[0].id).toBe('c');
    expect(result.map((e) => e.id)).toEqual(['c', 'a', 'b']);
  });
  it('有查詢時，標記且命中的排最前，未命中的濾除', () => {
    const favIds = new Set(['b']);
    const result = rankEntities('咖啡', favIds, pool);
    expect(result.map((e) => e.id)).toEqual(['b', 'a']);
  });
  it('查無結果回空陣列', () => {
    expect(rankEntities('豬腳', new Set(), pool)).toEqual([]);
  });
  it('限制回傳筆數上限', () => {
    const big = Array.from({ length: 60 }, (_, i) => ent({ id: `x${i}`, name: `店${i}` }));
    expect(rankEntities('', new Set(), big).length).toBe(40);
  });
});

describe('makeSnippet', () => {
  it('擷取命中前後文並標亮，前後截斷加省略號', () => {
    const text = 'A'.repeat(30) + '咖啡' + 'B'.repeat(30);
    const segs = makeSnippet(text, ['咖啡'], 5)!;
    expect(segs[0]).toEqual({ text: '…', hit: false });
    expect(segs.some((s) => s.hit && s.text === '咖啡')).toBe(true);
    expect(segs[segs.length - 1]).toEqual({ text: '…', hit: false });
  });
  it('markdown 語法清乾淨', () => {
    const md = '## 標題\n![圖](http://x/i.png)\n[Demel咖啡](http://x)推薦 | 表格';
    const segs = makeSnippet(md, ['咖啡'])!;
    const joined = segs.map((s) => s.text).join('');
    expect(joined).not.toContain('##');
    expect(joined).not.toContain('](');
    expect(joined).not.toContain('|');
    expect(joined).toContain('Demel咖啡');
  });
  it('無命中回 null', () => {
    expect(makeSnippet('美泉宮', ['咖啡'])).toBeNull();
  });
  it('空 tokens 回 null', () => {
    expect(makeSnippet('美泉宮', [])).toBeNull();
  });
});
