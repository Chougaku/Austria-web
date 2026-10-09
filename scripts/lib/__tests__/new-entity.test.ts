import { describe, it, expect } from 'vitest';
import { parseEntity } from '../parse-entity';
import { parseGuide } from '../parse-guide';
import { parseTodos } from '../parse-todos';
import { entityMarkdown, fileName, type NewEntity } from '../../../worker/src/entity';
import { guideMarkdown } from '../../../worker/src/guide';
import { insertTodo } from '../../../worker/src/todo';

// 網站新增的內容由 Worker 寫成 markdown，下次建置時要被同一套解析器讀進來。
const blank: Omit<NewEntity, 'category' | 'name'> = { type: '', city: '', location: '', address: '', ticket: '', price: '', summary: '' };

describe('從儀表板新增的檔案讀得回來', () => {
  it('景點：欄位、簡介、區域都對得上', () => {
    const name = '格洛麗埃特 Gloriette: 觀景台';
    const md = entityMarkdown({
      ...blank, category: '景點', name, type: '觀景台', city: '維也納', location: '維也納 / 美泉宮',
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

  it('餐廳：價位進基本資訊、慕尼黑市區歸到慕尼黑', () => {
    const e = parseEntity('餐廳', 'x.md', entityMarkdown({
      ...blank, category: '餐廳', name: 'Hofbräuhaus', type: '啤酒館', price: '€15–25', city: '慕尼黑', location: '慕尼黑',
    }, '2026-10-09'));
    expect(e.fields).toMatchObject({ 類型: '啤酒館', 價位: '€15–25' });
    expect(e.area).toBe('慕尼黑');
  });

  it('只填名稱也能建置', () => {
    const e = parseEntity('購物', 'x.md', entityMarkdown({ ...blank, category: '購物', name: 'Dallmayr' }, '2026-10-09'));
    expect(e.name).toBe('Dallmayr');
    expect(e.summary).toBe('');
    expect(e.fields).toEqual({});
  });

  it('攻略：標題取檔名、作者與原文網址從 frontmatter 來', () => {
    const md = guideMarkdown({ title: '維也納咖啡館', author: '小明', url: 'https://example.com/a', body: '## 必吃\n- Café Central' }, '2026-10-09');
    const g = parseGuide('維也納咖啡館.md', md);
    expect(g).toMatchObject({ id: '維也納咖啡館', title: '維也納咖啡館', source: '小明', sourceUrl: 'https://example.com/a' });
    expect(g.body).toBe('## 必吃\n- Café Central');
  });

  it('待辦：新的一行出現在清單最後，原本的勾選狀態不變', () => {
    const notes = '# 行程筆記\n\n## ✅ 待辦（後續可繼續補）\n\n- [ ] 訂機票\n- [x] 辦護照\n\n## 筆記\n\n- [ ] 這行不是待辦\n';
    const todos = parseTodos(insertTodo(notes, '買歐元現金')!);
    expect(todos.map((t) => [t.text, t.checkedInVault])).toEqual([['訂機票', false], ['辦護照', true], ['買歐元現金', false]]);
  });

  it('待辦段落還沒有任何項目時也接得上', () => {
    const md = insertTodo('# 行程筆記\n\n## ✅ 待辦\n\n## 筆記\n', '訂機票')!;
    expect(parseTodos(md).map((t) => t.text)).toEqual(['訂機票']);
    expect(parseTodos(insertTodo('# 行程筆記\n', '訂機票')!).map((t) => t.text)).toEqual(['訂機票']);
  });
});
