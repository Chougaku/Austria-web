import { describe, it, expect } from 'vitest';
import { buildOverview, isEntityFile } from '../../build-data';
import { legMode } from '../parse-overview';

const OV = `---
title: 總覽
---

## 基本資訊
- 出發：2027-06-14
- 回程：2027-06-30
- 季節：初夏

## 住宿
> 格式：- 城市｜入住–退房｜飯店（未訂寫「待訂」）｜停車｜備註
- 維也納｜06/15–06/18｜待訂｜不需要｜
- 格拉茨｜06/18–06/19｜Hotel Weitzer（已訂）｜飯店車庫｜
- 鹽湖區｜06/19–06/22｜待訂｜需要｜住 Bad Ischl

## 移動
- 06/18｜自駕｜維也納 → 格拉茨｜維也納取車
- 06/26｜火車｜因斯布魯克 → 慕尼黑｜
- 06/29｜飛機｜慕尼黑 -> 台灣｜

## 預訂
- 機票｜待訂｜台灣 → 維也納
- 租車｜✅ 已訂｜Sixt

## 交通備註
- 🚗｜高速公路要 Vignette
`;

describe('buildOverview', () => {
  it('抽 fields 與交通備註', () => {
    const o = buildOverview(OV);
    expect(o.fields['出發']).toBe('2027-06-14');
    expect(o.fields['季節']).toBe('初夏');
    expect(o.transportNotes).toEqual(['🚗｜高速公路要 Vignette']);
  });

  it('住宿：日期補上年份、算出晚數，「待訂」＝未訂；格式說明行略過', () => {
    const { stays } = buildOverview(OV);
    expect(stays).toHaveLength(3);
    expect(stays[0]).toEqual({
      city: '維也納', checkIn: '2027-06-15', checkOut: '2027-06-18', nights: 3,
      hotel: '', booked: false, parking: '不需要', note: '',
    });
    expect(stays[1]).toMatchObject({ hotel: 'Hotel Weitzer（已訂）', booked: true, nights: 1 });
    expect(stays[2].note).toBe('住 Bad Ischl');
  });

  it('移動：方式轉成代碼，→ 與 -> 都認得', () => {
    const { legs } = buildOverview(OV);
    expect(legs.map((l) => l.mode)).toEqual(['drive', 'train', 'flight']);
    expect(legs[0]).toEqual({ date: '2027-06-18', mode: 'drive', from: '維也納', to: '格拉茨', note: '維也納取車' });
    expect(legs[2].to).toBe('台灣');
  });

  it('預訂：狀態寫已訂／✅ 算完成', () => {
    const { bookings } = buildOverview(OV);
    expect(bookings.map((b) => [b.item, b.done])).toEqual([['機票', false], ['租車', true]]);
  });

  it('住宿格式錯（缺日期、退房不晚於入住）報錯並指出那一行', () => {
    expect(() => buildOverview(OV.replace('06/15–06/18', '下週'))).toThrow(/維也納｜下週/);
    expect(() => buildOverview(OV.replace('06/15–06/18', '06/18–06/15'))).toThrow(/退房要晚於入住/);
  });

  it('移動格式錯報錯', () => {
    expect(() => buildOverview(OV.replace('維也納 → 格拉茨', '維也納到格拉茨'))).toThrow(/移動格式錯誤/);
  });

  it('沒寫住宿／移動／預訂段落時給空陣列', () => {
    const o = buildOverview('## 基本資訊\n- 出發：2027-06-14\n- 回程：2027-06-30\n');
    expect(o.stays).toEqual([]);
    expect(o.legs).toEqual([]);
    expect(o.bookings).toEqual([]);
  });

  it('缺出發日期報錯', () => {
    expect(() => buildOverview(OV.replace('- 出發：2027-06-14', ''))).toThrow(/出發/);
  });

  it('CRLF 換行（Windows 簽出常見）也能正確解析', () => {
    const o = buildOverview(OV.replace(/\n/g, '\r\n'));
    expect(o.fields['出發']).toBe('2027-06-14');
    expect(o.stays).toHaveLength(3);
    expect(o.legs).toHaveLength(3);
  });
});

describe('legMode', () => {
  it('中文方式詞對應到代碼，認不得的歸 other', () => {
    expect(legMode('自駕')).toBe('drive');
    expect(legMode('開車')).toBe('drive');
    expect(legMode('火車')).toBe('train');
    expect(legMode('Railjet')).toBe('train');
    expect(legMode('飛機')).toBe('flight');
    expect(legMode('渡輪')).toBe('ferry');
    expect(legMode('步行')).toBe('other');
  });
});

describe('isEntityFile', () => {
  it('排除分類總覽索引頁（如 餐廳總覽.md、住宿總覽.md）', () => {
    expect(isEntityFile('餐廳', '餐廳總覽.md')).toBe(false);
    expect(isEntityFile('住宿', '住宿總覽.md')).toBe(false);
  });

  it('一般實體檔案照樣通過', () => {
    expect(isEntityFile('餐廳', 'Café-Sacher-Wien.md')).toBe(true);
  });

  it('非 md 檔案排除', () => {
    expect(isEntityFile('餐廳', 'notes.txt')).toBe(false);
  });

  it('其他分類的總覽檔名不會誤判（跨分類不比對）', () => {
    expect(isEntityFile('餐廳', '住宿總覽.md')).toBe(true);
  });
});
