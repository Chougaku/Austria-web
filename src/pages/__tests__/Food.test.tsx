// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { TripStateProvider } from '../../state/store';
import Food from '../Food';

vi.mock('../../state/auth', () => ({ useAuth: () => ({ canEdit: true, openLogin: vi.fn() }) }));

const RESTAURANTS = [
  { id: 'r1', category: '餐廳', name: 'Figlmüller', tags: [], updated: '', favorite: false,
    fields: { 類型: '炸肉排' }, summary: '炸肉排 4.4 分。', body: '', area: '維也納', rating: 4.4 },
  { id: 'r2', category: '餐廳', name: '花くじら', tags: [], updated: '', favorite: false,
    fields: { 類型: '炸肉排' }, summary: '維登名店', body: '', area: '維登', rating: 4.1 },
  { id: 'r3', category: '餐廳', name: 'Demel 格拉本', tags: [], updated: '', favorite: false,
    fields: { 類型: '咖啡' }, summary: '宮廷甜點', body: '', area: '格拉本', rating: 3.9 },
];

vi.mock('../../data', () => ({
  byCategory: (cat: string) => (cat === '餐廳' ? RESTAURANTS : []),
  entities: [], // search.ts 頂層 import { entities }，mock 必須提供
  todos: [], // TripStateProvider（store.tsx）需要
}));

vi.mock('../../lib/search', async (importOriginal) => {
  // suggestFoodTypes 依賴 ../data 的 entities，測試中直接覆寫；其餘用真實作。
  // count 故意用 5（與 chip 文字「炸肉排 2」區隔，避免 getByRole 撞名）
  const mod = await importOriginal<typeof import('../../lib/search')>();
  return {
    ...mod,
    suggestFoodTypes: (q: string) =>
      q.includes('炸肉') ? [{ type: '炸肉排', count: 5 }] : [],
  };
});

function renderFood() {
  return render(<TripStateProvider><Food /></TripStateProvider>);
}

describe('Food 就地搜尋', () => {
  afterEach(() => cleanup());

  it('多關鍵字 AND 過濾', () => {
    renderFood();
    fireEvent.change(screen.getByPlaceholderText('搜尋店名、類型、區域…'), { target: { value: '格拉本 咖啡' } });
    expect(screen.getByText(/Demel/)).toBeTruthy();
    expect(screen.queryByText('Figlmüller')).toBeNull();
  });

  it('店名命中排在摘要命中前（相關性排序）', () => {
    // 「花」命中 r2 店名（100 分）；不命中其他。名稱因命中標亮被拆成 <mark>+<span>
    // 兩個 DOM 節點，getByText 預設不跨元素邊界比對，改用 container.textContent 驗證。
    const { container } = renderFood();
    fireEvent.change(screen.getByPlaceholderText('搜尋店名、類型、區域…'), { target: { value: '花' } });
    expect(container.textContent).toContain('花くじら');
  });

  it('輸入命中類型時顯示分類建議，點選套用篩選並清空輸入', () => {
    renderFood();
    const input = screen.getByPlaceholderText('搜尋店名、類型、區域…');
    fireEvent.change(input, { target: { value: '炸肉' } });
    const option = screen.getByRole('button', { name: /炸肉排.*5/ });
    fireEvent.click(option);
    expect((input as HTMLInputElement).value).toBe('');
    // 篩選套用：咖啡店消失、兩間炸肉排在列
    expect(screen.queryByText(/Demel/)).toBeNull();
    expect(screen.getByText('Figlmüller')).toBeTruthy();
    // chips 列的「炸肉排」處於選中狀態（chip--on）
    const chips = screen.getAllByText(/^炸肉排/).filter((el) => el.closest('.chip'));
    expect(chips.some((el) => el.closest('.chip')?.className.includes('chip--on'))).toBe(true);
  });

  it('Esc 關閉建議浮層', () => {
    renderFood();
    const input = screen.getByPlaceholderText('搜尋店名、類型、區域…');
    fireEvent.change(input, { target: { value: '炸肉' } });
    expect(screen.getByRole('button', { name: /炸肉排.*5/ })).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: /炸肉排.*5/ })).toBeNull();
  });

  it('搜尋命中處以 mark.search-hit 標亮', () => {
    const { container } = renderFood();
    fireEvent.change(screen.getByPlaceholderText('搜尋店名、類型、區域…'), { target: { value: 'Demel' } });
    const mark = container.querySelector('mark.search-hit');
    expect(mark?.textContent).toBe('Demel');
  });

  it('無結果顯示空狀態', () => {
    renderFood();
    fireEvent.change(screen.getByPlaceholderText('搜尋店名、類型、區域…'), { target: { value: '不存在的店' } });
    expect(screen.getByText('沒有符合的店家')).toBeTruthy();
  });

  it('只看已標記且無任何標記時顯示引導文案', () => {
    renderFood();
    fireEvent.click(screen.getByText('♥ 只看已標記'));
    expect(screen.getByText('還沒有標記的店，去按 ♥')).toBeTruthy();
  });
});
