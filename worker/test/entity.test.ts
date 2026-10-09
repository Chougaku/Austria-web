import { describe, it, expect } from 'vitest';
import { entityMarkdown, fileName, parseNewEntity, type NewEntity } from '../src/entity';

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
  });

  it('名稱有冒號、引號也是合法 frontmatter；空欄位不寫', () => {
    const md = entityMarkdown({
      category: '景點', name: 'Schloss: "Belvedere"', type: '', city: '', location: '',
      address: '', ticket: '', summary: '# 開頭是井號',
    }, '2026-10-09');
    expect(md).toContain('title: "Schloss: \\"Belvedere\\""');
    expect(md).toContain('tags: ["景點"]');
    expect(md).toContain('\n開頭是井號\n');
    expect(md).not.toContain('- 類型');
  });
});
