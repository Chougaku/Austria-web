// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { StarInput, Stars } from '../Stars';
import AddPlace from '../AddPlace';
import EntityDetail from '../EntityDetail';
import { TripStateProvider } from '../../state/store';
import type { Entity } from '../../data/schema';

const auth = vi.hoisted(() => ({ canEdit: true, openLogin: vi.fn() }));
vi.mock('../../state/auth', () => ({ useAuth: () => auth }));
const api = vi.hoisted(() => ({ addEntity: vi.fn(), updateEntity: vi.fn(), uploadImage: vi.fn(), deleteItem: vi.fn() }));
vi.mock('../../api/add', () => api);
vi.mock('../../data', () => ({ entities: [], todos: [], meta: { builtAt: '2026-11-04T00:00:00.000Z' } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); auth.canEdit = true; localStorage.clear(); document.body.style.overflow = ''; });

const entity: Entity = {
  id: '景點/美泉宮', category: '景點', name: '美泉宮', tags: [], updated: '', favorite: false,
  fields: { 類型: '宮殿', 評分: '4.4' }, summary: '夏宮', body: '夏宮', area: '美泉宮', rating: 4.4,
};

describe('Stars 顯示', () => {
  it('依分數填滿、念得出幾顆星；沒評分不顯示', () => {
    const { container, rerender } = render(<Stars value={4.4} showValue />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('評分 4.4 顆星（滿分 5）');
    expect((container.querySelector('.stars-fill') as HTMLElement).style.width).toBe('88%');
    expect(container.textContent).toContain('4.4');
    rerender(<Stars value={null} />);
    expect(container.querySelector('.stars')).toBeNull();
  });
});

describe('StarInput 點星星', () => {
  function Harness() {
    const [v, setV] = useState(0);
    return <StarInput value={v} onChange={setV} />;
  }
  it('點第幾顆就幾顆、再點同一顆清掉；方向鍵加減', () => {
    render(<Harness />);
    expect(screen.getByText('還沒評分')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: '4 顆星' }));
    expect(screen.getByRole('radio', { name: '4 顆星' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('4 顆星')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('radio', { name: '4 顆星' }), { key: 'ArrowRight' });
    expect(screen.getByText('5 顆星')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: '5 顆星' }));
    expect(screen.getByText('還沒評分')).toBeTruthy();
  });
});

describe('表單裡的評分', () => {
  it('新增時送出星等', async () => {
    api.addEntity.mockResolvedValue({ id: 'x' });
    const onAdded = vi.fn();
    render(<AddPlace category="餐廳" onCancel={vi.fn()} onAdded={onAdded} />);
    fireEvent.change(screen.getByLabelText('名稱（必填）'), { target: { value: 'Figlmüller' } });
    fireEvent.click(screen.getByRole('radio', { name: '5 顆星' }));
    fireEvent.submit(screen.getByRole('form', { name: '新增餐廳' }));
    await waitFor(() => expect(onAdded).toHaveBeenCalled());
    expect(api.addEntity.mock.calls[0][0].rating).toBe('5');
  });

  it('編輯：原本 4.4 顯示四顆；沒去點就不送評分（小數不會被改掉），改了才送', async () => {
    api.updateEntity.mockResolvedValue({ id: entity.id });
    render(<AddPlace category="景點" edit={entity} onCancel={vi.fn()} onAdded={vi.fn()} />);
    expect(screen.getByRole('radio', { name: '4 顆星' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.change(screen.getByLabelText('簡介'), { target: { value: '哈布斯堡的夏宮' } });
    fireEvent.submit(screen.getByRole('form', { name: '編輯景點' }));
    await waitFor(() => expect(api.updateEntity).toHaveBeenCalledTimes(1));
    expect(api.updateEntity.mock.calls[0][0].changes).toEqual({ summary: '哈布斯堡的夏宮' });
  });
});

describe('詳細頁直接評分', () => {
  const renderDetail = () => render(<TripStateProvider><EntityDetail entity={entity} onClose={vi.fn()} /></TripStateProvider>);

  it('登入後點星星就存（只送評分），顯示已存', async () => {
    api.updateEntity.mockResolvedValue({ id: entity.id });
    renderDetail();
    fireEvent.click(screen.getByRole('radio', { name: '5 顆星' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('已存'));
    expect(api.updateEntity).toHaveBeenCalledWith({ id: entity.id, changes: { rating: '5' }, removeImages: [], addImages: [] });
  });

  it('存失敗退回原本的星等、顯示原因', async () => {
    api.updateEntity.mockRejectedValue(new Error('登入已失效，請重新登入後再新增'));
    renderDetail();
    fireEvent.click(screen.getByRole('radio', { name: '2 顆星' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('重新登入'));
    expect(screen.getByRole('radio', { name: '4 顆星' }).getAttribute('aria-checked')).toBe('true');
  });

  it('沒登入只顯示星星，不能點', () => {
    auth.canEdit = false;
    renderDetail();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByRole('img', { name: '評分 4.4 顆星（滿分 5）' })).toBeTruthy();
  });
});
