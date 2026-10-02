// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { TripStateProvider } from '../../state/store';
import Places from '../Places';

vi.mock('../../state/auth', () => ({ useAuth: () => ({ canEdit: true, openLogin: vi.fn() }) }));

vi.mock('../../data', () => ({
  byCategory: (cat: string) => {
    if (cat === '景點') return [
      { id: 'p1', category: '景點', name: '美泉宮', tags: [], updated: '', favorite: false,
        fields: { 類型: '宮殿' }, summary: '巴洛克宮殿', body: '', area: '美泉宮花園', rating: 4.2 },
      { id: 'p2', category: '景點', name: '海布倫宮', tags: [], updated: '', favorite: false,
        fields: { 類型: '噴泉' }, summary: '惡作劇噴泉', body: '', area: '海布倫', rating: 4.5 },
    ];
    if (cat === '購物') return [
      { id: 's1', category: '購物', name: '格拉本大街', tags: [], updated: '', favorite: false,
        fields: {}, summary: '名店與伴手禮', body: '', area: '格拉本', rating: null },
    ];
    return [];
  },
  entities: [], // search.ts 頂層 import { entities }，mock 必須提供
  todos: [], // TripStateProvider（store.tsx）需要
}));

const PLACEHOLDER = '搜尋景點、購物…';

describe('Places 就地搜尋', () => {
  afterEach(() => cleanup());

  it('無查詢時全部顯示、計數正確', () => {
    render(<TripStateProvider><Places /></TripStateProvider>);
    expect(screen.getByText('2 處')).toBeTruthy();
    expect(screen.getByText(/1 處/)).toBeTruthy();
  });

  it('查詢同時過濾兩區並更新計數', () => {
    render(<TripStateProvider><Places /></TripStateProvider>);
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: '美泉宮' } });
    expect(screen.getByText('美泉宮')).toBeTruthy();
    expect(screen.queryByText('海布倫宮')).toBeNull();
    expect(screen.queryByText('格拉本大街')).toBeNull();
    expect(screen.getByText('1 處')).toBeTruthy();
  });

  it('單區無結果顯示該區空狀態', () => {
    render(<TripStateProvider><Places /></TripStateProvider>);
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: '海布倫宮' } });
    expect(screen.getByText('沒有符合的購物點')).toBeTruthy();
  });

  it('兩區皆無結果顯示整頁空狀態', () => {
    render(<TripStateProvider><Places /></TripStateProvider>);
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: '不存在' } });
    expect(screen.getByText('沒有符合的項目')).toBeTruthy();
  });

  it('命中處標亮', () => {
    const { container } = render(<TripStateProvider><Places /></TripStateProvider>);
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: '惡作劇噴泉' } });
    expect(container.querySelector('mark.search-hit')?.textContent).toBe('惡作劇噴泉');
  });
});
