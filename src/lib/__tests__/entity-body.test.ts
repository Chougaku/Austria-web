import { describe, it, expect } from 'vitest';
import { stripEntityCardBody } from '../entity-body';

const AFTER_BASIC = `介紹文字。

## 基本資訊
- 營運：JR西日本
- 座位：指定席

![](https://img.x/route.jpg)
*路線圖說明*

## 所需時間
- 35 分鐘

## 來源
- 官網`;

const BEFORE_BASIC = `介紹文字。

![](https://img.x/train.jpg)
*外觀*

## 基本資訊
- 路線：維也納機場 → 維也納
- 官網：<https://x>

## 票價
- €1000`;

describe('stripEntityCardBody', () => {
  it('砍基本資訊項目，但保留其後緊接的圖片', () => {
    const out = stripEntityCardBody(AFTER_BASIC);
    expect(out).toContain('![](https://img.x/route.jpg)');
    expect(out).not.toContain('## 基本資訊');
    expect(out).not.toContain('營運：JR西日本');
    expect(out).toContain('## 所需時間');
  });
  it('圖片在基本資訊之前時保留，基本資訊項目仍被砍', () => {
    const out = stripEntityCardBody(BEFORE_BASIC);
    expect(out).toContain('![](https://img.x/train.jpg)');
    expect(out).not.toContain('## 基本資訊');
    expect(out).not.toContain('路線：維也納機場');
    expect(out).toContain('## 票價');
  });
  it('砍來源段到結尾', () => {
    expect(stripEntityCardBody(AFTER_BASIC)).not.toContain('## 來源');
  });
  it('無基本資訊時其他內容不動', () => {
    const body = '介紹\n\n![](https://img.x/map.gif)\n\n## 路線一覽\n- A';
    expect(stripEntityCardBody(body)).toContain('![](https://img.x/map.gif)');
    expect(stripEntityCardBody(body)).toContain('## 路線一覽');
  });
});
