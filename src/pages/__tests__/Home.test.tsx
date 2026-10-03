// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { TripStateProvider } from '../../state/store';
import Home from '../Home';

vi.mock('../../state/auth', () => ({
  useAuth: () => ({ canEdit: true, openLogin: vi.fn(), logout: vi.fn() }),
}));

vi.mock('../../data', () => ({
  byCategory: () => [],
  entities: [],
  guides: [],
  todos: [],
  meta: { builtAt: '2026-10-02T00:00:00Z', tripStart: '2027-06-14', tripEnd: '2027-06-30' },
  overview: {
    fields: {
      出發: '2027-06-14',
      出發顯示: '06.14 週一',
      回程: '2027-06-30',
      回程顯示: '06.30 週三',
      天數: '17天・住宿14晚',
      季節: '初夏',
    },
    stays: [
      { city: '維也納', checkIn: '2027-06-15', checkOut: '2027-06-18', nights: 3, hotel: '', booked: false, parking: '不需要', note: '' },
      { city: '格拉茨', checkIn: '2027-06-18', checkOut: '2027-06-19', nights: 1, hotel: 'Hotel Weitzer', booked: true, parking: '有', note: '' },
    ],
    legs: [
      { date: '2027-06-18', mode: 'drive', from: '維也納', to: '格拉茨', note: '維也納取車' },
      { date: '2027-06-26', mode: 'train', from: '因斯布魯克', to: '慕尼黑', note: '' },
    ],
    bookings: [
      { item: '機票', status: '待訂', done: false, detail: '台灣 → 維也納' },
      { item: '租車', status: '已訂', done: true, detail: '維也納取車' },
    ],
    transportNotes: ['🚗｜高速公路要 Vignette'],
  },
}));

const renderHome = () => render(
  <TripStateProvider>
    <Home />
  </TripStateProvider>,
);

describe('Home 頁面與路線圖主視覺', () => {
  afterEach(() => cleanup());

  it('最上面是立體地景，圖檔走 Vite base、帶 900w／1600w 兩種尺寸', () => {
    renderHome();
    const img = screen.getByRole('img', { name: /微縮立體地景/ }) as HTMLImageElement;
    expect(img.getAttribute('src')).toMatch(/diorama-1600\.webp$/);
    expect(img.getAttribute('srcset')).toMatch(/diorama-900\.webp 900w, .*diorama-1600\.webp 1600w/);
  });

  it('立體地景下面接路線圖（桌機地圖版＋手機蛇形版），依行程順序列出六座城市', () => {
    renderHome();
    const map = screen.getByRole('img', { name: /路線圖/ });
    expect(map.getAttribute('aria-label')).toBe('路線圖：維也納 → 格拉茨 → 鹽湖區 → 薩爾茲堡 → 因斯布魯克 → 慕尼黑');
    expect(screen.getByRole('img', { name: /^路線：/ })).toBeTruthy();
  });

  it('問候列與行程摘要顯示出發、回程與天數', () => {
    renderHome();
    expect(screen.getByText('Servus，旅伴 👋')).toBeTruthy();
    expect(screen.getByText('06.14 週一')).toBeTruthy();
    expect(screen.getByText('06.30 週三')).toBeTruthy();
    expect(screen.getAllByText('17天・住宿14晚').length).toBeGreaterThan(0);
  });

  it('住宿逐城列出：未訂的標「住宿待訂」，訂好的顯示飯店名', () => {
    renderHome();
    expect(screen.getByText('住宿待訂')).toBeTruthy();
    expect(screen.getByText('✓ Hotel Weitzer')).toBeTruthy();
    expect(screen.getByText(/2 段・4 晚・已訂 1/)).toBeTruthy();
  });

  it('移動卡分出自駕與火車，預訂卡算出已訂幾項', () => {
    renderHome();
    expect(screen.getByText('自駕', { selector: 'small' })).toBeTruthy();
    expect(screen.getByText('火車', { selector: 'small' })).toBeTruthy();
    expect(screen.getByText('1 / 2 已訂')).toBeTruthy();
  });
});
