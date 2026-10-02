// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import GuideFavCard from '../GuideFavCard';
import { TripStateProvider } from '../../state/store';

vi.mock('../../data', () => ({
  guides: [
    { id: 'g1', title: '維也納美食攻略', source: '', sourceUrl: '', body: 'A' },
    { id: 'g2', title: '交通懶人包', source: '', sourceUrl: '', body: 'B' },
  ],
  entities: [], // store.tsx 頂層 import
  todos: [],    // store.tsx 頂層 import
}));

function renderCard() {
  return render(<TripStateProvider><GuideFavCard /></TripStateProvider>);
}

describe('GuideFavCard 首頁典藏攻略', () => {
  beforeEach(() => { localStorage.clear(); location.hash = ''; });
  afterEach(() => cleanup());

  it('沒有任何典藏時不渲染', () => {
    const { container } = renderCard();
    expect(container.firstChild).toBeNull();
  });

  it('列出已典藏攻略標題，未典藏的不顯示', () => {
    localStorage.setItem('austria-trip-state', JSON.stringify({ 'guide:g2': true }));
    renderCard();
    expect(screen.getByText('典藏攻略')).toBeTruthy();
    expect(screen.getByText('交通懶人包')).toBeTruthy();
    expect(screen.queryByText('維也納美食攻略')).toBeNull();
  });

  it('點擊標題跳到攻略分頁', () => {
    localStorage.setItem('austria-trip-state', JSON.stringify({ 'guide:g2': true }));
    renderCard();
    fireEvent.click(screen.getByText('交通懶人包'));
    expect(location.hash).toBe('#guides');
  });

  it('取消典藏（值為 false）視同未典藏', () => {
    localStorage.setItem('austria-trip-state', JSON.stringify({ 'guide:g2': false }));
    const { container } = renderCard();
    expect(container.firstChild).toBeNull();
  });
});
