import { describe, it, expect } from 'vitest';
import { parseGuide } from '../parse-guide';

const FM = `---
title: "Post by @zhangsanfeng4315 on Threads"
source: "https://www.threads.com/@zhangsanfeng4315/post/XYZ"
author:
  - "[[@zhangsanfeng4315]]"
published: 2026-06-13
---

## 維也納商圈購物攻略
逛街路線內容…
`;

const BLOCKQUOTE = `# 維也納購物4大商圈攻略

> 來源：[Threads @casestw.3](https://www.threads.com/@casestw.3/post/ABC)
> 原始出處：小紅書

## 圖片總覽
內容…
`;

const PLAIN = `# 我們的奧地利行

> 來源：Anna分享的 Google Maps 清單「我們的奧地利行」
> 資料更新日期：2026-06-12

## 餐廳與美食
內容…
`;

describe('parseGuide', () => {
  it('標題取檔名（去 .md）', () => {
    expect(parseGuide('維也納購物攻略與優惠券.md', FM).title).toBe('維也納購物攻略與優惠券');
  });

  it('frontmatter 來源：URL 與作者（清 wikilink）', () => {
    const g = parseGuide('x.md', FM);
    expect(g.sourceUrl).toBe('https://www.threads.com/@zhangsanfeng4315/post/XYZ');
    expect(g.source).toBe('@zhangsanfeng4315');
  });

  it('內文 > 來源 的 markdown 連結 → 取文字與 URL', () => {
    const g = parseGuide('x.md', BLOCKQUOTE);
    expect(g.source).toBe('Threads @casestw.3');
    expect(g.sourceUrl).toBe('https://www.threads.com/@casestw.3/post/ABC');
  });

  it('內文 > 來源 純文字（無連結）→ source 有值、sourceUrl 空', () => {
    const g = parseGuide('x.md', PLAIN);
    expect(g.source).toContain('Anna');
    expect(g.sourceUrl).toBe('');
  });

  it('body 保留內文並去掉 frontmatter', () => {
    const g = parseGuide('x.md', FM);
    expect(g.body).toContain('維也納商圈購物攻略');
    expect(g.body).not.toContain('published:');
  });

  it('完全沒有來源時 source/sourceUrl 皆空、不報錯', () => {
    const g = parseGuide('x.md', '# 標題\n\n一些內容');
    expect(g.source).toBe('');
    expect(g.sourceUrl).toBe('');
  });
});
