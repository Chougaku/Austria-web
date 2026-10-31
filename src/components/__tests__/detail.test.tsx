// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { TripStateProvider } from '../../state/store';
import EntityDetail from '../EntityDetail';
import type { Entity } from '../../data/schema';

const auth = vi.hoisted(() => ({ canEdit: true, openLogin: vi.fn() }));
vi.mock('../../state/auth', () => ({ useAuth: () => auth }));
const api = vi.hoisted(() => ({ deleteItem: vi.fn(), updateEntity: vi.fn(), uploadImage: vi.fn(), addEntity: vi.fn() }));
vi.mock('../../api/add', () => api);
vi.mock('../../data', () => ({ entities: [], todos: [], meta: { builtAt: '2026-10-31T00:00:00.000Z' } }));
// jsdom 沒有 canvas：縮圖換成假的
vi.mock('../../lib/image-file', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/image-file')>()),
  prepareImage: vi.fn(async (f: File) => ({ blob: new Blob([f.name], { type: 'image/jpeg' }), thumb: 'data:image/jpeg;base64,x' })),
}));

const entity: Entity = {
  id: '餐廳/Öfferl', category: '餐廳', name: 'Öfferl - Praterstrasse 26（更）', tags: [], updated: '', favorite: false,
  fields: { 類型: '咖啡廳', 價位: '10-20歐' }, summary: '奶油蛋捲配火腿很特別', area: '普拉特', rating: null,
  body: '奶油蛋捲配火腿很特別\n\n## 基本資訊\n- 類型：咖啡廳\n- 價位：10-20歐\n\n## 照片\n![](vault-img/a.jpg)\n![](vault-img/b.jpg)\n\n## 來源\n- 從儀表板新增',
  images: [{ file: '20261029-aaaaaaaa.jpg', url: 'vault-img/a.jpg' }, { file: '20261029-bbbbbbbb.jpg', url: 'vault-img/b.jpg' }],
};
const renderDetail = (props: Partial<Parameters<typeof EntityDetail>[0]> = {}) => {
  const onClose = vi.fn();
  render(<TripStateProvider><EntityDetail entity={entity} onClose={onClose} {...props} /></TripStateProvider>);
  return onClose;
};

afterEach(() => {
  cleanup(); vi.restoreAllMocks(); api.deleteItem.mockReset(); api.updateEntity.mockReset(); api.uploadImage.mockReset();
  auth.canEdit = true; auth.openLogin.mockReset(); localStorage.clear(); document.body.style.overflow = '';
});

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
    renderDetail({ entity: { ...entity, body: '簡介', images: undefined } });
    expect(document.querySelector('.gallery')).toBeNull();
    expect(screen.getByRole('dialog').textContent).toContain('簡介');
  });
});

describe('EntityDetail 編輯', () => {
  it('表單帶入原本的內容；只送改過的欄位、拿掉的舊照片、新上傳的照片；存好後提示等重建', async () => {
    api.uploadImage.mockResolvedValue({ id: '20261031-cccccccc.jpg' });
    api.updateEntity.mockResolvedValue({ id: entity.id });
    renderDetail();
    fireEvent.click(screen.getByRole('button', { name: '編輯' }));
    const form = screen.getByRole('form', { name: '編輯餐廳' });
    expect((screen.getByLabelText('名稱（必填）') as HTMLInputElement).value).toBe(entity.name);
    expect((screen.getByLabelText('價位') as HTMLInputElement).value).toBe('10-20歐');
    expect((screen.getByLabelText('簡介') as HTMLTextAreaElement).value).toBe('奶油蛋捲配火腿很特別');
    expect((screen.getByLabelText('區域') as HTMLSelectElement).value).toBe('普拉特');
    fireEvent.change(screen.getByLabelText('價位'), { target: { value: '15-25歐' } });
    fireEvent.click(screen.getByRole('button', { name: '拿掉原本的第 1 張' }));
    fireEvent.change(screen.getByLabelText('選擇照片'), { target: { files: [new File(['x'], 'new.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(form.querySelectorAll('.img-thumb')).toHaveLength(2));
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('已儲存'));
    expect(api.updateEntity).toHaveBeenCalledWith({
      id: entity.id, changes: { price: '15-25歐' },
      removeImages: ['20261029-aaaaaaaa.jpg'], addImages: ['20261031-cccccccc.jpg'],
    });
    expect(screen.queryByRole('form')).toBeNull(); // 回到檢視
  });

  it('改區域會送「城市 / 區域」；什麼都沒改就不送', async () => {
    api.updateEntity.mockResolvedValue({ id: entity.id });
    renderDetail();
    fireEvent.click(screen.getByRole('button', { name: '編輯' }));
    fireEvent.submit(screen.getByRole('form', { name: '編輯餐廳' }));
    expect(screen.getByRole('alert').textContent).toContain('沒有任何修改');
    expect(api.updateEntity).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('區域'), { target: { value: '維也納' } });
    fireEvent.submit(screen.getByRole('form', { name: '編輯餐廳' }));
    await waitFor(() => expect(api.updateEntity).toHaveBeenCalled());
    expect(api.updateEntity.mock.calls[0][0].changes).toEqual({ city: '維也納', location: '維也納' });
  });

  it('存檔失敗顯示原因、表單留著；按取消回到檢視', async () => {
    api.updateEntity.mockRejectedValue(new Error('已經有同名的地點了'));
    renderDetail();
    fireEvent.click(screen.getByRole('button', { name: '編輯' }));
    fireEvent.change(screen.getByLabelText('名稱（必填）'), { target: { value: 'Öfferl - Praterstrasse 26' } });
    fireEvent.submit(screen.getByRole('form', { name: '編輯餐廳' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('同名'));
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('form')).toBeNull();
    expect(screen.getByRole('heading', { name: entity.name })).toBeTruthy();
  });

  it('沒登入按編輯先跳登入框', () => {
    auth.canEdit = false;
    renderDetail();
    fireEvent.click(screen.getByRole('button', { name: '編輯' }));
    expect(auth.openLogin).toHaveBeenCalled();
    expect(screen.queryByRole('form')).toBeNull();
  });
});
