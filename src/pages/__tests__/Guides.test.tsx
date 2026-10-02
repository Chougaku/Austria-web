// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import Guides from '../Guides';
import { TripStateProvider } from '../../state/store';

vi.mock('../../data', () => ({
  guides: [
    { id: 'g1', title: '維也納美食攻略', source: '', sourceUrl: '', body: '本文開頭。中段推薦薩赫蛋糕與蘋果捲名店。' },
    { id: 'g2', title: '交通懶人包', source: '', sourceUrl: '', body: 'ICOCA 卡使用方式' },
  ],
  entities: [], // search.ts 與 store.tsx 頂層 import，mock 必須提供
  todos: [],    // store.tsx 頂層 import
}));

const openLogin = vi.fn();
vi.mock('../../state/auth', () => ({
  useAuth: () => ({ canEdit: true, openLogin }),
}));

const PLACEHOLDER = '搜尋攻略內容…';

function renderGuides() {
  return render(<TripStateProvider><Guides /></TripStateProvider>);
}

describe('Guides 就地搜尋', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it('預設收合，點擊標題展開內文', () => {
    const { container } = renderGuides();
    expect(container.querySelector('.guide-body--open')).toBeNull();
    fireEvent.click(screen.getByText('維也納美食攻略'));
    expect(container.querySelector('.guide-body--open')).toBeTruthy();
  });

  it('查詢過濾攻略並顯示符合篇數', () => {
    renderGuides();
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: '薩赫蛋糕' } });
    expect(screen.getByText('維也納美食攻略')).toBeTruthy();
    expect(screen.queryByText('交通懶人包')).toBeNull();
    expect(screen.getByText('符合 1 篇')).toBeTruthy();
  });

  it('命中卡片標題下顯示 snippet 且命中處標亮', () => {
    const { container } = renderGuides();
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: '薩赫蛋糕' } });
    const mark = container.querySelector('mark.search-hit');
    expect(mark?.textContent).toBe('薩赫蛋糕');
  });

  it('標題命中但內文未命中時不顯示 snippet', () => {
    // 「懶人包」只命中標題後半，標題因標亮被拆成 <span>交通</span><mark>懶人包</mark>
    // 兩個 DOM 節點，getByText 預設不跨元素邊界比對，改用 container.textContent 驗證。
    const { container } = renderGuides();
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: '懶人包' } });
    expect(container.textContent).toContain('交通懶人包');
    // body「ICOCA 卡使用方式」不含「懶人包」→ 無 snippet 元素
    expect(screen.queryByTestId('guide-snippet')).toBeNull();
  });

  it('展開命中卡片後內文以 mark 標亮', () => {
    const { container } = renderGuides();
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: '薩赫蛋糕' } });
    fireEvent.click(screen.getByText('維也納美食攻略'));
    const marks = [...container.querySelectorAll('.guide-body mark.search-hit')].map((m) => m.textContent);
    expect(marks).toContain('薩赫蛋糕');
  });

  it('無結果顯示空狀態', () => {
    renderGuides();
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: '不存在' } });
    expect(screen.getByText('沒有符合的攻略')).toBeTruthy();
  });
});

describe('Guides 典藏', () => {
  beforeEach(() => { localStorage.clear(); openLogin.mockReset(); });
  afterEach(() => cleanup());

  it('每張卡有典藏按鈕，點擊典藏不觸發卡片展開', () => {
    const { container } = renderGuides();
    const stars = screen.getAllByRole('button', { name: '典藏' });
    expect(stars).toHaveLength(2);
    fireEvent.click(stars[0]);
    expect(container.querySelector('.guide-body--open')).toBeNull();
  });

  it('已典藏的攻略置頂', () => {
    localStorage.setItem('austria-trip-state', JSON.stringify({ 'guide:g2': true }));
    const { container } = renderGuides();
    const text = container.textContent!;
    expect(text.indexOf('交通懶人包')).toBeLessThan(text.indexOf('維也納美食攻略'));
  });

  it('沒有任何典藏時不顯示「只看典藏」鈕', () => {
    renderGuides();
    expect(screen.queryByText('★ 只看典藏')).toBeNull();
  });

  it('只看典藏：僅顯示已典藏攻略', () => {
    localStorage.setItem('austria-trip-state', JSON.stringify({ 'guide:g2': true }));
    renderGuides();
    fireEvent.click(screen.getByText('★ 只看典藏'));
    expect(screen.getByText('交通懶人包')).toBeTruthy();
    expect(screen.queryByText('維也納美食攻略')).toBeNull();
  });

  it('只看典藏與搜尋取交集，無交集顯示空狀態', () => {
    localStorage.setItem('austria-trip-state', JSON.stringify({ 'guide:g2': true }));
    renderGuides();
    fireEvent.click(screen.getByText('★ 只看典藏'));
    // 「薩赫蛋糕」只命中未典藏的 g1 → 交集為空
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: '薩赫蛋糕' } });
    expect(screen.getByText('沒有符合的攻略')).toBeTruthy();
  });

  it('篩選開啟中取消最後一篇典藏：鈕仍在，可關閉篩選', () => {
    localStorage.setItem('austria-trip-state', JSON.stringify({ 'guide:g2': true }));
    renderGuides();
    fireEvent.click(screen.getByText('★ 只看典藏'));
    // 取消唯一一篇的典藏 → 清單空，但篩選鈕必須還在
    fireEvent.click(screen.getByRole('button', { name: '典藏' }));
    expect(screen.getByText('沒有符合的攻略')).toBeTruthy();
    fireEvent.click(screen.getByText('★ 只看典藏')); // 關閉篩選
    expect(screen.getByText('維也納美食攻略')).toBeTruthy();
  });
});
