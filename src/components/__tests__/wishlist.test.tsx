// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TripStateProvider } from '../../state/store';
import WishList from '../WishList';
import type { Entity } from '../../data/schema';

// WishList 內含 Heart，Heart 需要 auth context；以已登入（canEdit）情境驗證 WishList 本身行為
vi.mock('../../state/auth', () => ({ useAuth: () => ({ canEdit: true, openLogin: vi.fn() }) }));

const ent = (id: string, category: Entity['category'], name: string, area = '維也納'): Entity => ({
  id, category, name, tags: [], updated: '', favorite: false, fields: {}, summary: '', body: '', area, rating: null,
});

describe('WishList', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it('依分類分組，顯示名稱、區域與地圖連結', () => {
    render(
      <TripStateProvider>
        <WishList items={[ent('餐廳/Demel', '餐廳', 'Demel咖啡'), ent('景點/摩天輪', '景點', '摩天輪', '普拉特')]} />
      </TripStateProvider>,
    );
    expect(screen.getByText('Demel咖啡')).toBeTruthy();
    expect(screen.getByText('摩天輪')).toBeTruthy();
    expect(screen.getByText('普拉特')).toBeTruthy();
    expect(screen.getAllByTitle(/在 Google 地圖搜尋/)).toHaveLength(2);
    // 分組標題：餐廳在景點前（CATEGORIES 順序）
    const headers = screen.getAllByText(/^(餐廳|景點)/).map((el) => el.textContent?.trim());
    expect(headers).toEqual(['餐廳 1', '景點 1']);
  });

  it('點 ♥ 取消標記（寫回 state）', () => {
    localStorage.setItem('austria-trip-state', JSON.stringify({ 'fav:餐廳/Demel': true }));
    render(
      <TripStateProvider>
        <WishList items={[ent('餐廳/Demel', '餐廳', 'Demel咖啡')]} />
      </TripStateProvider>,
    );
    fireEvent.click(screen.getAllByLabelText('收藏')[0]);
    expect(JSON.parse(localStorage.getItem('austria-trip-state')!)['fav:餐廳/Demel']).toBe(false);
  });

  it('空清單顯示提示', () => {
    render(<TripStateProvider><WishList items={[]} /></TripStateProvider>);
    expect(screen.getByText(/還沒有標記/)).toBeTruthy();
  });
});
