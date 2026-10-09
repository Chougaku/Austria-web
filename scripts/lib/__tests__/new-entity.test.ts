import { describe, it, expect } from 'vitest';
import { parseEntity } from '../parse-entity';
import { entityMarkdown, fileName } from '../../../worker/src/entity';

// 網站新增的地點由 Worker 寫成 markdown，下次建置時要被同一支解析器讀進來。
describe('從儀表板新增的檔案讀得回來', () => {
  it('欄位、簡介、區域都對得上', () => {
    const name = '格洛麗埃特 Gloriette: 觀景台';
    const md = entityMarkdown({
      category: '景點', name, type: '觀景台', city: '維也納', location: '維也納 / 美泉宮',
      address: 'Schönbrunner Schloßstraße, 1130 Wien', ticket: '€5', summary: '美泉宮山丘上的凱旋門。',
    }, '2026-10-09');
    const e = parseEntity('景點', `${fileName(name)}.md`, md);
    expect(e.name).toBe(name);
    expect(e.id).toBe('景點/格洛麗埃特 Gloriette 觀景台');
    expect(e.fields).toMatchObject({ 類型: '觀景台', 門票: '€5', 位置: '維也納 / 美泉宮' });
    expect(e.summary).toBe('美泉宮山丘上的凱旋門。');
    expect(e.area).toBe('美泉宮');
    expect(e.tags).toEqual(['景點', '維也納']);
  });

  it('只填名稱也能建置', () => {
    const e = parseEntity('購物', 'x.md', entityMarkdown({
      category: '購物', name: 'Dallmayr', type: '', city: '', location: '', address: '', ticket: '', summary: '',
    }, '2026-10-09'));
    expect(e.name).toBe('Dallmayr');
    expect(e.summary).toBe('');
    expect(e.fields).toEqual({});
  });
});
