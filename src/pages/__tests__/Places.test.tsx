// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { TripStateProvider } from '../../state/store';
import Places from '../Places';

const auth = vi.hoisted(() => ({ canEdit: true, openLogin: vi.fn() }));
vi.mock('../../state/auth', () => ({ useAuth: () => auth }));
const addEntity = vi.hoisted(() => vi.fn());
vi.mock('../../api/entity', () => ({ addEntity }));

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

describe('Places 新增景點／購物', () => {
  afterEach(() => { cleanup(); auth.canEdit = true; auth.openLogin.mockReset(); addEntity.mockReset(); });

  it('登入後按「新增景點」打開表單，送出「城市 / 區域」與城市標籤', async () => {
    addEntity.mockResolvedValue({ id: '景點/格洛麗埃特' });
    render(<TripStateProvider><Places /></TripStateProvider>);
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增景點' }));
    const form = screen.getByRole('form', { name: '新增景點' });
    fireEvent.change(screen.getByLabelText('名稱（必填）'), { target: { value: ' 格洛麗埃特 ' } });
    fireEvent.change(screen.getByLabelText('區域'), { target: { value: '美泉宮' } });
    fireEvent.change(screen.getByLabelText('門票'), { target: { value: '€5' } });
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('已新增「格洛麗埃特」'));
    expect(addEntity).toHaveBeenCalledWith({
      category: '景點', name: '格洛麗埃特', type: '', city: '維也納', location: '維也納 / 美泉宮',
      address: '', ticket: '€5', summary: '',
    });
    expect(screen.queryByRole('form', { name: '新增景點' })).toBeNull();
  });

  it('購物沒有門票欄；選市區只寫城市名', async () => {
    addEntity.mockResolvedValue({ id: '購物/x' });
    render(<TripStateProvider><Places /></TripStateProvider>);
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增購物' }));
    expect(screen.queryByLabelText('門票')).toBeNull();
    fireEvent.change(screen.getByLabelText('名稱（必填）'), { target: { value: 'Dallmayr' } });
    fireEvent.change(screen.getByLabelText('區域'), { target: { value: '慕尼黑' } });
    fireEvent.submit(screen.getByRole('form', { name: '新增購物' }));
    await waitFor(() => expect(addEntity).toHaveBeenCalled());
    expect(addEntity.mock.calls[0][0]).toMatchObject({ category: '購物', city: '慕尼黑', location: '慕尼黑', ticket: '' });
  });

  it('沒填名稱不送出；送出失敗顯示原因、表單保留', async () => {
    addEntity.mockRejectedValue(new Error('已經有同名的地點了'));
    render(<TripStateProvider><Places /></TripStateProvider>);
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增景點' }));
    const form = screen.getByRole('form', { name: '新增景點' });
    fireEvent.submit(form);
    expect(screen.getByRole('alert').textContent).toContain('請填名稱');
    expect(addEntity).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('名稱（必填）'), { target: { value: '美泉宮' } });
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('已經有同名的地點了'));
    expect(screen.getByRole('form', { name: '新增景點' })).toBeTruthy();
  });

  it('沒登入按新增會跳登入框', () => {
    auth.canEdit = false;
    render(<TripStateProvider><Places /></TripStateProvider>);
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增景點' }));
    expect(auth.openLogin).toHaveBeenCalled();
    expect(screen.queryByRole('form')).toBeNull();
  });
});
