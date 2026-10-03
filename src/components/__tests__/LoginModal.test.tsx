// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import LoginModal from '../LoginModal';

const mockLogin = vi.fn();
const closeLogin = vi.fn();
let open = true;
vi.mock('../../state/auth', () => ({
  useAuth: () => ({ loginOpen: open, closeLogin, login: mockLogin }),
}));

describe('LoginModal', () => {
  beforeEach(() => { open = true; mockLogin.mockReset(); closeLogin.mockReset(); });
  afterEach(() => cleanup());

  it('關閉時不渲染', () => {
    open = false;
    const { container } = render(<LoginModal />);
    expect(container.firstChild).toBeNull();
  });

  it('密碼輸入具手機數字鍵盤屬性', () => {
    render(<LoginModal />);
    const input = screen.getByLabelText('密碼') as HTMLInputElement;
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('autocomplete')).toBe('one-time-code');
    expect(input.type).toBe('password');
  });

  it('密碼錯誤顯示錯誤訊息', async () => {
    mockLogin.mockResolvedValue(false);
    render(<LoginModal />);
    fireEvent.change(screen.getByLabelText('密碼'), { target: { value: '9999' } });
    fireEvent.click(screen.getByRole('button', { name: '登入' }));
    await waitFor(() => expect(screen.getByText('密碼錯誤')).toBeTruthy());
    expect(mockLogin).toHaveBeenCalledWith('9999');
  });

  it('連不上伺服器時不說密碼錯誤', async () => {
    mockLogin.mockRejectedValue(new Error('POST login 503'));
    render(<LoginModal />);
    fireEvent.change(screen.getByLabelText('密碼'), { target: { value: '1111' } });
    fireEvent.click(screen.getByRole('button', { name: '登入' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('連不上伺服器，請確認網路後再試'));
    expect(screen.queryByText('密碼錯誤')).toBeNull();
  });
});
