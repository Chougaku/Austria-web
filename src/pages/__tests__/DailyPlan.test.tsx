// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { TripStateProvider } from '../../state/store';
import { ItineraryProvider } from '../../state/itinerary';
import DailyPlan from '../DailyPlan';

vi.mock('../../data', () => ({
  entities: [
    { id: 'r1', category: '餐廳', name: 'Café Sacher', tags: [], updated: '', favorite: false,
      fields: {}, summary: '', body: '', area: '維也納', rating: 4.2 },
    { id: 'p1', category: '景點', name: '美泉宮', tags: [], updated: '', favorite: false,
      fields: {}, summary: '', body: '', area: '美泉宮', rating: 4.6 },
    { id: 's1', category: '購物', name: 'Manner 史蒂芬廣場店', tags: [], updated: '', favorite: false,
      fields: {}, summary: '', body: '', area: '維也納', rating: null },
  ],
  days: [{
    label: 'Day 2', date: '06/16 週三', theme: '維也納', areas: ['維也納'],
    slots: [
      { time: '上午', title: '美泉宮', note: '先預約時段票', pending: false },
      { time: '中午', title: 'Café Sacher', note: '原創薩赫蛋糕', pending: false },
      { time: '傍晚', title: 'Manner 史蒂芬廣場店', note: '伴手禮', pending: false },
      { time: '晚上', title: '維也納 → 格拉茨', note: '自駕約 2 小時', pending: false },
    ],
  }, {
    label: 'Day 3', date: '06/17 週四', theme: '維也納 → 格拉茨', areas: ['維也納', '格拉茨'],
    slots: [
      { time: '上午', title: '美景宮', note: '', pending: false },
    ],
  }],
  todos: [],
  meta: { builtAt: '2026-10-02T10:00:00.000Z', tripStart: '2027-06-14', tripEnd: '2027-06-30' },
  overview: {
    fields: {},
    stays: [
      { city: '維也納', checkIn: '2027-06-15', checkOut: '2027-06-17', nights: 2, hotel: 'Hotel Sacher', booked: true, parking: '', note: '' },
      { city: '格拉茨', checkIn: '2027-06-17', checkOut: '2027-06-18', nights: 1, hotel: '', booked: false, parking: '', note: '' },
    ],
    legs: [{ date: '2027-06-17', mode: 'drive', from: '維也納', to: '格拉茨', note: '' }],
    bookings: [],
    transportNotes: [],
  },
  byCategory: () => [],
}));

function renderPlan() {
  return render(
    <TripStateProvider><ItineraryProvider><DailyPlan /></ItineraryProvider></TripStateProvider>,
  );
}

/** 時段列＝含 plan-slot class 且帶標題文字的那個容器。 */
function slotRow(title: string): HTMLElement {
  const el = screen.getByText(title).closest('.plan-slot');
  if (!el) throw new Error(`找不到「${title}」的時段列`);
  return el as HTMLElement;
}

describe('DailyPlan 時段類型標記', () => {
  afterEach(() => cleanup());

  it('美食與景點各自帶類型 class', () => {
    renderPlan();
    expect(slotRow('Café Sacher').className).toContain('plan-slot--food');
    expect(slotRow('美泉宮').className).toContain('plan-slot--sight');
  });

  it('購物時段完全不標記——沒有類型 class，也沒有小方章', () => {
    renderPlan();
    const row = slotRow('Manner 史蒂芬廣場店');
    expect(row.className).not.toMatch(/plan-slot--(food|sight|shop|move|stay)/);
    expect(row.querySelector('.plan-kind')).toBeNull();
  });

  it('美食與景點的列有小方章', () => {
    renderPlan();
    expect(slotRow('Café Sacher').querySelector('.plan-kind')?.textContent).toBe('食');
    expect(slotRow('美泉宮').querySelector('.plan-kind')?.textContent).toBe('景');
  });

  it('圖例只有美食與景點兩項', () => {
    const { container } = renderPlan();
    const items = container.querySelectorAll('.plan-legend .plan-legend-item');
    expect(Array.from(items).map((n) => n.textContent)).toEqual(['食美食', '景景點']);
  });
});

describe('DailyPlan 地圖連結', () => {
  afterEach(() => cleanup());

  it('地點時段附 Google 地圖連結，查詢用實體的名稱＋區域的拉丁地名', () => {
    renderPlan();
    const link = slotRow('美泉宮').querySelector('a');
    expect(link?.getAttribute('href')).toContain(encodeURIComponent('美泉宮 Wien'));
    expect(link?.getAttribute('target')).toBe('_blank');
  });

  it('交通時段不掛連結——講的是移動本身，沒有地點可搜', () => {
    renderPlan();
    expect(slotRow('維也納 → 格拉茨').querySelector('a')).toBeNull();
  });
});

describe('DailyPlan 多城市資訊', () => {
  afterEach(() => cleanup());

  it('換城那天的日期鈕標出移動方式', () => {
    renderPlan();
    const btn = screen.getByRole('button', { name: /Day 3/ });
    expect(btn.querySelector('.plan-day-mode')?.textContent).toBe('🚗');
    expect(screen.getByRole('button', { name: /Day 2/ }).querySelector('.plan-day-mode')).toBeNull();
  });

  it('標題下方寫出當天的移動與今晚住哪', () => {
    renderPlan();
    expect(screen.getByText(/今晚住/).textContent).toContain('Hotel Sacher');
    fireEvent.click(screen.getByRole('button', { name: /Day 3/ }));
    expect(screen.getByText(/自駕・維也納 → 格拉茨/)).toBeTruthy();
    expect(screen.getByText('住宿待訂')).toBeTruthy();
  });
});

const api = vi.hoisted(() => ({ putItinerary: vi.fn() }));
vi.mock('../../api/itinerary', () => ({ putItinerary: api.putItinerary }));
vi.mock('../../api/state', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/state')>()),
  configured: () => true,
  fetchState: async () => ({}),
  flushQueue: async () => {},
  putState: async () => {},
}));

/** 進入編輯模式後按下「儲存並提交」。 */
async function submit() {
  renderPlan();
  fireEvent.click(screen.getByRole('button', { name: '編輯' }));
  fireEvent.click(screen.getByRole('button', { name: '儲存並提交' }));
}

describe('DailyPlan 提交回饋', () => {
  afterEach(() => { cleanup(); api.putItinerary.mockReset(); });

  it('提交失敗時，錯誤以帶 role 的醒目橫幅呈現', async () => {
    api.putItinerary.mockRejectedValue(new Error('Worker 的 GitHub token 已失效或權限不足，需重新設定 GITHUB_TOKEN'));
    await submit();
    const banner = await screen.findByRole('status');
    expect(banner.textContent).toContain('GITHUB_TOKEN');
    expect(banner.className).toContain('plan-msg--err');
  });

  it('提交成功時橫幅走成功樣式，與失敗明顯不同', async () => {
    api.putItinerary.mockResolvedValue(undefined);
    await submit();
    const banner = await screen.findByRole('status');
    expect(banner.textContent).toContain('已提交');
    expect(banner.className).toContain('plan-msg--ok');
  });

  it('欄位沒填完時不送出，並把畫面帶到出問題的那一天', async () => {
    renderPlan();
    fireEvent.click(screen.getByRole('button', { name: '編輯' }));
    // 在 Day 3 加一個空時段，然後切回 Day 2 提交——錯誤在使用者看不到的那一天。
    fireEvent.click(screen.getByRole('button', { name: /Day 3/ }));
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增時段' }));
    fireEvent.click(screen.getByRole('button', { name: /Day 2/ }));
    fireEvent.click(screen.getByRole('button', { name: '儲存並提交' }));

    const banner = await screen.findByRole('status');
    expect(banner.textContent).toContain('Day 3 第 2 個時段的「時間」是空的');
    expect(api.putItinerary).not.toHaveBeenCalled();
    expect(document.querySelector('.plan-card .serif')?.textContent).toBe('Day 3');
  });

  it('提交失敗時游標直接落在該補的欄位上', async () => {
    renderPlan();
    fireEvent.click(screen.getByRole('button', { name: '編輯' }));
    fireEvent.click(screen.getByRole('button', { name: /Day 3/ }));
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增時段' }));
    fireEvent.click(screen.getByRole('button', { name: /Day 2/ }));
    fireEvent.click(screen.getByRole('button', { name: '儲存並提交' }));

    await screen.findByRole('status');
    expect(document.activeElement?.getAttribute('data-slot-field')).toBe('1-time');
  });
});
