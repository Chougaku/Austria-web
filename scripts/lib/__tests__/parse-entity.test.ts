import { describe, it, expect } from 'vitest';
import { parseEntity } from '../parse-entity';

const REST = `---
title: Figlmüller Wollzeile
tags: [餐廳, 炸肉排]
updated: 2026-10-02
---

維也納的炸肉排老店。

## 基本資訊
- 類型：炸肉排
- 評分：4.5
- 價位：€20-30
- 備註：-

## 來源
- [[原始資料/餐廳/Figlmüller]]
`;

describe('parseEntity', () => {
  it('解析餐廳頁完整欄位', () => {
    const e = parseEntity('餐廳', 'Figlmuller.md', REST);
    expect(e.id).toBe('餐廳/Figlmuller');
    expect(e.name).toBe('Figlmüller Wollzeile');
    expect(e.rating).toBe(4.5);
    expect(e.fields['類型']).toBe('炸肉排');
    expect(e.fields['價位']).toBe('€20-30');
    expect(e.summary).toBe('維也納的炸肉排老店。');
    expect(e.favorite).toBe(false);
  });

  it('位置欄位含 wikilink 時清掉並抽出區域', () => {
    const raw = REST.replace('- 備註：-', '- 位置：[[哈修塔特|Hallstatt]] 湖畔');
    const e = parseEntity('景點', 'X.md', raw);
    expect(e.fields['位置']).toBe('Hallstatt 湖畔');
    expect(e.area).toBe('哈修塔特');
  });

  it('tags 含區域時可補抽區域', () => {
    const raw = REST.replace('tags: [餐廳, 炸肉排]', 'tags: [購物, 奧地利, 格拉茨]');
    expect(parseEntity('購物', 'X.md', raw).area).toBe('格拉茨');
  });

  it('位置欄空白時退而用店名裡的地名', () => {
    const raw = REST.replace('title: Figlmüller Wollzeile', 'title: Café Sacher Salzburg');
    expect(parseEntity('餐廳', 'X.md', raw).area).toBe('薩爾茲堡');
  });

  it('位置、店名、tags 都沒有時，用內文「## 交通」段落的最近地標', () => {
    const raw = REST
      .replace('title: Figlmüller Wollzeile', 'title: Zum Wohl')
      .replace('## 來源', '## 交通\n- 北山纜車 Hungerburg 站步行 3 分\n\n## 來源');
    expect(parseEntity('餐廳', 'X.md', raw).area).toBe('北山');
  });

  it('評分為 N/A 或缺欄時 rating 為 null', () => {
    const raw = REST.replace('- 評分：4.5', '- 評分：N/A');
    expect(parseEntity('餐廳', 'X.md', raw).rating).toBeNull();
  });

  it('評分非數字時報錯且訊息含檔名', () => {
    const raw = REST.replace('- 評分：4.5', '- 評分：很好吃');
    expect(() => parseEntity('餐廳', 'BAD.md', raw)).toThrow(/餐廳\/BAD/);
  });

  it('frontmatter 缺 title 報錯', () => {
    const raw = REST.replace('title: Figlmüller Wollzeile', 'foo: bar');
    expect(() => parseEntity('餐廳', 'BAD.md', raw)).toThrow(/餐廳\/BAD/);
  });

  it('favorite: true 生效', () => {
    const raw = REST.replace('updated: 2026-10-02', 'updated: 2026-10-02\nfavorite: true');
    expect(parseEntity('餐廳', 'X.md', raw).favorite).toBe(true);
  });

  it('圖片嵌入 ![[圖.jpg]] 轉標準 markdown 且不被 stripWikilinks 破壞', () => {
    const raw = REST.replace(
      '維也納的炸肉排老店。',
      '維也納的炸肉排老店。\n\n![[招牌.jpg]]',
    );
    const e = parseEntity('餐廳', 'X.md', raw);
    expect(e.body).toContain('![](招牌.jpg)');
    expect(e.body).not.toContain('![[招牌.jpg]]');
    expect(e.summary).toBe('維也納的炸肉排老店。');
  });
});
