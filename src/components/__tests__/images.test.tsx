// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import AddPlace from '../AddPlace';
import SlotImages, { SlotPhotos } from '../SlotImages';

const api = vi.hoisted(() => ({ addEntity: vi.fn(), uploadImage: vi.fn() }));
vi.mock('../../api/add', () => api);
// jsdom 沒有 canvas：縮圖這步換成假的，其餘（依序上傳）用真的
vi.mock('../../lib/image-file', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/image-file')>()),
  prepareImage: vi.fn(async (f: File) => {
    if (f.name.endsWith('.heic')) throw new Error(`「${f.name}」讀不了，iPhone 的 HEIC 請先轉成 JPG 再選`);
    return { blob: new Blob([f.name], { type: 'image/jpeg' }), thumb: `data:image/jpeg;base64,${f.name}` };
  }),
}));

const file = (name: string) => new File(['x'], name, { type: name.endsWith('.heic') ? 'image/heic' : 'image/jpeg' });
const pick = (label: string, ...names: string[]) =>
  fireEvent.change(screen.getByLabelText(label), { target: { files: names.map(file) } });

afterEach(() => { cleanup(); api.addEntity.mockReset(); api.uploadImage.mockReset(); });

describe('新增地點加照片', () => {
  it('選圖先顯示縮圖（第一張標封面），送出時依序上傳、把檔名交給新增', async () => {
    let n = 0;
    api.uploadImage.mockImplementation(async () => ({ id: `20261029-0000000${++n}.jpg` }));
    api.addEntity.mockResolvedValue({ id: '景點/美景宮' });
    const onAdded = vi.fn();
    render(<AddPlace category="景點" onCancel={vi.fn()} onAdded={onAdded} />);
    pick('選擇照片', 'a.jpg', 'b.jpg', 'c.jpg');
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(3));
    expect(screen.getByText('封面')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '移除第 2 張' }));
    fireEvent.change(screen.getByLabelText('名稱（必填）'), { target: { value: '美景宮' } });
    fireEvent.submit(screen.getByRole('form', { name: '新增景點' }));
    await waitFor(() => expect(onAdded).toHaveBeenCalledWith('美景宮'));
    expect(await Promise.all(api.uploadImage.mock.calls.map(([b]) => (b as Blob).text()))).toEqual(['a.jpg', 'c.jpg']);
    expect(api.addEntity.mock.calls[0][0].images).toEqual(['20261029-00000001.jpg', '20261029-00000002.jpg']);
  });

  it('新增失敗（例如同名）改名重送：照片不重傳', async () => {
    api.uploadImage.mockResolvedValue({ id: '20261029-00000001.jpg' });
    api.addEntity.mockRejectedValueOnce(new Error('已經有同名的地點了')).mockResolvedValueOnce({ id: 'x' });
    render(<AddPlace category="購物" onCancel={vi.fn()} onAdded={vi.fn()} />);
    pick('選擇照片', 'a.jpg');
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(1));
    fireEvent.change(screen.getByLabelText('名稱（必填）'), { target: { value: 'Manner' } });
    fireEvent.submit(screen.getByRole('form', { name: '新增購物' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('同名'));
    fireEvent.change(screen.getByLabelText('名稱（必填）'), { target: { value: 'Manner 2' } });
    fireEvent.submit(screen.getByRole('form', { name: '新增購物' }));
    await waitFor(() => expect(api.addEntity).toHaveBeenCalledTimes(2));
    expect(api.uploadImage).toHaveBeenCalledTimes(1);
    expect(api.addEntity.mock.calls[1][0].images).toEqual(['20261029-00000001.jpg']);
  });

  it('讀不了的圖（HEIC）說明原因，超過張數只收得下的', async () => {
    render(<AddPlace category="景點" onCancel={vi.fn()} onAdded={vi.fn()} />);
    pick('選擇照片', 'a.heic');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('HEIC'));
    pick('選擇照片', ...Array.from({ length: 11 }, (_, i) => `${i + 1}.jpg`));
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(10));
    expect(screen.getByRole('alert').textContent).toContain('最多 10 張');
    expect(screen.queryByRole('button', { name: '＋ 照片' })).toBeNull();
  });
});

describe('每日行程時段照片', () => {
  it('選了馬上上傳，先用本機縮圖預覽', async () => {
    api.uploadImage.mockResolvedValue({ id: '20261029-3fa9c1d2.jpg' });
    const onChange = vi.fn();
    render(<SlotImages images={[]} onChange={onChange} />);
    pick('選擇時段照片', 'a.jpg');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([
      { file: '20261029-3fa9c1d2.jpg', url: 'data:image/jpeg;base64,a.jpg' },
    ]));
  });

  it('上傳失敗顯示原因，不加進時段', async () => {
    api.uploadImage.mockRejectedValue(new Error('登入已失效，請重新登入後再新增'));
    const onChange = vi.fn();
    render(<SlotImages images={[]} onChange={onChange} />);
    pick('選擇時段照片', 'a.jpg');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('重新登入'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('檢視：點縮圖全螢幕看、停在點的那張，剛上傳的本機縮圖也看得了；Esc 關閉', () => {
    render(<SlotPhotos title="美泉宮" images={[{ file: 'a.jpg', url: 'vault-img/a-1234abcd.jpg' }, { file: 'b.jpg', url: 'data:image/jpeg;base64,x' }]} />);
    fireEvent.click(screen.getByRole('button', { name: '放大看「美泉宮」照片 2' }));
    const viewer = screen.getByRole('dialog', { name: '照片' });
    expect(viewer.textContent).toContain('2 / 2');
    expect(viewer.querySelectorAll('img')).toHaveLength(2);
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(viewer.textContent).toContain('1 / 2');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
