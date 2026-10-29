import { describe, it, expect } from 'vitest';
import { entityMarkdown, fileName, parseNewEntity, type NewEntity } from '../src/entity';
import { imageFileName, sniffImage } from '../src/image';

describe('新增實體的欄位整理', () => {
  it('檔名拿掉路徑與 Obsidian 不能用的字元', () => {
    expect(fileName('Café Sacher / Wien #1')).toBe('Café Sacher Wien 1');
    expect(fileName('..[[x]]')).toBe('x');
    expect(fileName('///')).toBe('');
  });

  it('購物不收門票、欄位收成單行、超過長度擋下', () => {
    const e = parseNewEntity({ category: '購物', name: ' Manner\n店 ', ticket: '€5' }) as NewEntity;
    expect(e.name).toBe('Manner 店');
    expect(e.ticket).toBe('');
    expect(parseNewEntity({ category: '景點', name: 'x'.repeat(81) })).toBe('名稱太長（最多 80 字）');
    expect(parseNewEntity({ category: '景點', name: '***' })).toBe('名稱不能只有符號');
    expect(parseNewEntity(null)).toBe('資料格式不對');
    expect(parseNewEntity({ category: '交通', name: 'x' })).toBe('只能新增餐廳、景點或購物');
  });

  it('名稱有冒號、引號也是合法 frontmatter；空欄位不寫', () => {
    const md = entityMarkdown({
      category: '景點', name: 'Schloss: "Belvedere"', type: '', city: '', location: '',
      address: '', ticket: '', price: '', summary: '# 開頭是井號', images: [],
    }, '2026-10-09');
    expect(md).toContain('title: "Schloss: \\"Belvedere\\""');
    expect(md).toContain('tags: ["景點"]');
    expect(md).toContain('\n開頭是井號\n');
    expect(md).not.toContain('- 類型');
  });
});

describe('餐廳', () => {
  it('收價位、不收門票，價位寫進基本資訊', () => {
    const e = parseNewEntity({ category: '餐廳', name: 'Figlmüller', price: '€20–30', ticket: '€5', location: '維也納' }) as NewEntity;
    expect(e.ticket).toBe('');
    const md = entityMarkdown(e, '2026-10-09');
    expect(md).toContain('- 價位：€20–30');
    expect(md).not.toContain('門票');
  });
});

describe('圖片', () => {
  it('實體：圖片放在「## 照片」段落，不會變成卡片上的簡介', () => {
    const e = parseNewEntity({ category: '景點', name: '美景宮', images: ['20261029-3fa9c1d2.jpg', '20261029-0b1c2d3e.png'] }) as NewEntity;
    const md = entityMarkdown(e, '2026-10-29');
    expect(md).toContain('## 照片\n![[20261029-3fa9c1d2.jpg]]\n![[20261029-0b1c2d3e.png]]\n');
  });

  it('只收上傳時發的檔名，最多 4 張', () => {
    expect(parseNewEntity({ category: '景點', name: 'x', images: ['../../secret.md'] })).toBe('圖片檔名不對');
    expect(parseNewEntity({ category: '景點', name: 'x', images: ['a]] ![[b.jpg'] })).toBe('圖片檔名不對');
    expect(parseNewEntity({ category: '景點', name: 'x', images: Array(5).fill('20261029-3fa9c1d2.jpg') })).toBe('圖片最多 4 張');
    expect(parseNewEntity({ category: '景點', name: 'x', images: 'x.jpg' })).toBe('圖片清單格式不對');
  });

  it('看檔頭認圖片、檔名是日期加亂數', () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe('jpg');
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png');
    expect(sniffImage(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
    expect(sniffImage(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
    expect(imageFileName('jpg', '2026-10-29', '3FA9C1D2-1111-4222-8333-444455556666')).toBe('20261029-3fa9c1d2.jpg');
  });
});
