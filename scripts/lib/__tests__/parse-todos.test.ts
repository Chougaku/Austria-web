import { describe, it, expect } from 'vitest';
import { parseTodos } from '../parse-todos';

const DOC = `---
title: 行程
---

## 📅 行程日期
- 出發：2026/09/30

## ✅ 待辦（後續可繼續補）

- [ ] 確認機票航班時段（出發/回程時間）
- [x] 評估是否購買 [[周遊券]]
- [ ] 預約人氣餐廳

## 來源
- foo
`;

describe('parseTodos', () => {
  it('只抽待辦區段的核取項目', () => {
    const todos = parseTodos(DOC);
    expect(todos).toHaveLength(3);
    expect(todos[0].text).toBe('確認機票航班時段（出發/回程時間）');
    expect(todos[0].key).toMatch(/^todo:/);
    expect(todos[0].checkedInVault).toBe(false);
  });

  it('wikilink 清掉、[x] 標為已勾', () => {
    const todos = parseTodos(DOC);
    expect(todos[1].text).toBe('評估是否購買 周遊券');
    expect(todos[1].checkedInVault).toBe(true);
  });

  it('沒有待辦區段回空陣列', () => {
    expect(parseTodos('---\ntitle: x\n---\n無待辦')).toEqual([]);
  });
});