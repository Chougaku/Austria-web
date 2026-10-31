// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { TripStateProvider } from '../../state/store';
import EntityDetail from '../EntityDetail';
import type { Entity } from '../../data/schema';

const auth = vi.hoisted(() => ({ canEdit: true, openLogin: vi.fn() }));
vi.mock('../../state/auth', () => ({ useAuth: () => auth }));
const api = vi.hoisted(() => ({ deleteItem: vi.fn() }));
vi.mock('../../api/add', () => api);
vi.mock('../../data', () => ({ entities: [], todos: [], meta: { builtAt: '2026-10-31T00:00:00.000Z' } }));

const entity: Entity = {
  id: '餐廳/Öfferl', category: '餐廳', name: 'Öfferl - Praterstrasse 26（更）', tags: [], updated: '', favorite: false,
  fields: { 類型: '咖啡廳', 價位: '10-20歐' }, summary: '奶油蛋捲配火腿很特別', area: '普拉特', rating: null,
  body: '奶油蛋捲配火腿很特別\n\n## 基本資訊\n- 類型：咖啡廳\n- 價位：10-20歐\n\n## 照片\n![](vault-img/a.jpg)\n![](vault-img/b.jpg)\n\n## 來源\n- 從儀表板新增',
};
const renderDetail = (props: Partial<Parameters<typeof EntityDetail>[0]> = {}) => {
  const onClose = vi.fn();
  render(<TripStateProvider><EntityDetail entity={entity} onClose={onClose} {...props} /></TripStateProvider>);
  return onClose;
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); api.deleteItem.mockReset(); localStorage.clear(); document.body.style.overflow = ''; });

describe('EntityDetail 詳細頁', () => {
  it('照片列在上面（可以換張），內文是 vault 的內容但不重複放照片', () => {
    renderDetail();
    const dialog = screen.getByRole('dialog', { name: entity.name });
    expect(dialog.textContent).toContain('1 / 2');
    expect(dialog.textContent).toContain('價位：10-20歐');
    expect(dialog.textContent).not.toContain('照片');
    expect(dialog.querySelectorAll('.gallery img')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '下一張' }));
    expect(dialog.textContent).toContain('2 / 2');
    expect((screen.getByRole('button', { name: '下一張' }) as HTMLButtonElement).disabled).toBe(true);
    expect(document.body.style.overflow).toBe('hidden'); // 背景不捲
  });

  it('從封面第 2 張點進來就停在第 2 張；點照片全螢幕看，Esc 只關最上層', () => {
    const onClose = renderDetail({ start: 1 });
    expect(screen.getByRole('dialog', { name: entity.name }).textContent).toContain('2 / 2');
    fireEvent.click(screen.getByRole('button', { name: '放大看第 2 張' }));
    expect(screen.getByRole('dialog', { name: '照片' }).textContent).toContain('2 / 2');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '照片' })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('點背景、按 ✕ 關閉；點內容不關', () => {
    const onClose = renderDetail();
    fireEvent.click(screen.getByText('奶油蛋捲配火腿很特別'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '關閉' }));
    fireEvent.click(document.querySelector('.modal-backdrop')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('在詳細頁刪除，刪完關掉', async () => {
    api.deleteItem.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onClose = renderDetail();
    fireEvent.click(screen.getByRole('button', { name: `刪除「${entity.name}」` }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.deleteItem).toHaveBeenCalledWith({ kind: 'entity', id: '餐廳/Öfferl' });
  });

  it('沒照片時不出現照片列', () => {
    renderDetail({ entity: { ...entity, body: '簡介' } });
    expect(document.querySelector('.gallery')).toBeNull();
    expect(screen.getByRole('dialog').textContent).toContain('簡介');
  });
});
