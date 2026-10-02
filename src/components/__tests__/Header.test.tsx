// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { TripStateProvider } from '../../state/store';
import Header from '../Header';

vi.mock('../../state/auth', () => ({
  useAuth: () => ({ canEdit: false, openLogin: vi.fn(), logout: vi.fn() }),
}));

function renderHeader(onNavigate = vi.fn()) {
  return render(
    <TripStateProvider>
      <Header tab="home" onNavigate={onNavigate} />
    </TripStateProvider>,
  );
}

describe('Header', () => {
  afterEach(() => { cleanup(); });

  it('顯示標題與倒數、無回到頂部按鈕（header 固定不收合）', () => {
    renderHeader();
    expect(screen.getByText(/奧地利旅券/)).toBeTruthy();
    expect(screen.getByText('出發倒數')).toBeTruthy();
    expect(screen.queryByLabelText('回到頂部')).toBeNull();
  });

  it('點 tab chip 呼叫 onNavigate 並捲回頂部', () => {
    const onNavigate = vi.fn();
    window.scrollTo = vi.fn();
    renderHeader(onNavigate);
    fireEvent.click(screen.getByText('每日行程'));
    expect(onNavigate).toHaveBeenCalledWith('plan');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
