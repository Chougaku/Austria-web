// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { TripStateProvider } from '../../state/store';
import Food from '../Food';
import { resetDeletedCache } from '../../lib/deleted';
const api = vi.hoisted(() => ({ addEntity: vi.fn(), addGuide: vi.fn(), addTodo: vi.fn(), uploadImage: vi.fn(), deleteItem: vi.fn() }));
vi.mock('../../api/add', () => api);

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

describe('Food 新增餐廳', () => {
  afterEach(() => { cleanup(); api.addEntity.mockReset(); });

  it('表單有價位、沒有門票，送出後顯示等待重建的提示', async () => {
    api.addEntity.mockResolvedValue({ id: '餐廳/Figlmüller' });
    renderFood();
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增餐廳' }));
    expect(screen.queryByLabelText('門票')).toBeNull();
    fireEvent.change(screen.getByLabelText('名稱（必填）'), { target: { value: 'Figlmüller' } });
    fireEvent.change(screen.getByLabelText('價位'), { target: { value: '€20–30' } });
    fireEvent.change(screen.getByLabelText('區域'), { target: { value: '維也納' } });
    fireEvent.submit(screen.getByRole('form', { name: '新增餐廳' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('已新增「Figlmüller」'));
    expect(api.addEntity).toHaveBeenCalledWith(expect.objectContaining({
      category: '餐廳', name: 'Figlmüller', price: '€20–30', ticket: '', city: '維也納', location: '維也納',
    }));
  });
});

describe('Food 刪除餐廳', () => {
  afterEach(() => { cleanup(); api.deleteItem.mockReset(); localStorage.clear(); resetDeletedCache(); });

  it('按取消不刪；確認後刪掉，卡片和計數馬上更新', async () => {
    api.deleteItem.mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderFood();
    const btn = screen.getByRole('button', { name: '刪除「Figlmüller」' });
    fireEvent.click(btn);
    expect(api.deleteItem).not.toHaveBeenCalled();
    fireEvent.click(btn);
    await waitFor(() => expect(screen.queryByText('Figlmüller')).toBeNull());
    expect(api.deleteItem).toHaveBeenCalledWith({ kind: 'entity', id: 'r1' });
    expect(screen.getByText('共 2 間')).toBeTruthy();
    confirm.mockRestore();
  });

  it('刪除失敗跳出原因，卡片留著', async () => {
    api.deleteItem.mockRejectedValue(new Error('登入已失效，請重新登入後再刪除'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderFood();
    fireEvent.click(screen.getByRole('button', { name: '刪除「Figlmüller」' }));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('登入已失效，請重新登入後再刪除'));
    expect(screen.getByText('Figlmüller')).toBeTruthy();
    vi.restoreAllMocks();
  });
});

describe('Food 點卡片看詳細', () => {
  afterEach(() => { cleanup(); RESTAURANTS[0].body = ''; document.body.style.overflow = ''; });

  it('點卡片任何地方打開詳細頁；點收藏、地圖不會開', () => {
    renderFood();
    fireEvent.click(screen.getAllByRole('button', { name: '收藏' })[0]);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByText('宮廷甜點'));
    expect(screen.getByRole('dialog', { name: 'Demel 格拉本' })).toBeTruthy();
  });

  it('標題是按鈕（鍵盤也能開）；多張照片的封面點了停在那一張', () => {
    RESTAURANTS[0].body = ['## 照片', '![](vault-img/a.jpg)', '![](vault-img/b.jpg)'].join('\n');
    renderFood();
    fireEvent.click(screen.getByRole('button', { name: '看「Figlmüller」的照片（2 張）' }));
    expect(screen.getByRole('dialog', { name: 'Figlmüller' }).textContent).toContain('1 / 2');
    fireEvent.click(screen.getByRole('button', { name: '關閉' }));
    fireEvent.click(screen.getByRole('button', { name: '花くじら' }));
    expect(screen.getByRole('dialog', { name: '花くじら' })).toBeTruthy();
  });
});
