import { describe, it, expect, vi } from 'vitest';
import { imagesIn } from '../images';
import { uploadAll } from '../image-file';

describe('imagesIn', () => {
  it('只取網站顯示得出來的圖（vault-img/ 或外部網址），照出現順序', () => {
    const body = '簡介\n\n## 照片\n![](vault-img/a-1234abcd.jpg)\n![](找不到的.jpg)\n![說明](https://example.com/b.png)';
    expect(imagesIn(body)).toEqual(['vault-img/a-1234abcd.jpg', 'https://example.com/b.png']);
    expect(imagesIn(undefined)).toEqual([]);
  });
});

describe('uploadAll', () => {
  it('依序上傳，已經傳過的直接沿用檔名', async () => {
    const order: string[] = [];
    const upload = vi.fn(async (b: Blob) => { const t = await b.text(); order.push(t); return { id: `file-${t}` }; });
    const done = new Map<number, string>([[1, 'old-file']]);
    const items = [1, 2, 3].map((id) => ({ id, blob: new Blob([String(id)]) }));
    const steps: number[] = [];
    expect(await uploadAll(items, upload, done, (i) => steps.push(i))).toEqual(['old-file', 'file-2', 'file-3']);
    expect(order).toEqual(['2', '3']);
    expect(steps).toEqual([1, 2]);
    expect(done.get(3)).toBe('file-3');
  });
});

describe('withoutImages（詳細頁的內文）', () => {
  it('拿掉「## 照片」整段與內文裡的圖，其他段落留著', async () => {
    const { withoutImages } = await import('../images');
    const body = '好吃的炸肉排。\n\n## 基本資訊\n- 類型：維也納菜\n\n## 照片\n![](vault-img/a.jpg)\n![](vault-img/b.jpg)\n\n## 來源\n- 從儀表板新增';
    expect(withoutImages(body)).toBe('好吃的炸肉排。\n\n## 基本資訊\n- 類型：維也納菜\n\n## 來源\n- 從儀表板新增');
    expect(withoutImages('簡介\n\n## 照片\n![](vault-img/a.jpg)')).toBe('簡介');
    expect(withoutImages('文字 ![](x.jpg) 結尾')).toBe('文字  結尾');
  });
});
