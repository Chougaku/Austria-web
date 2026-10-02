// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import GuideStar from '../GuideStar';
import { TripStateProvider } from '../../state/store';

const openLogin = vi.fn();
let canEdit = false;
vi.mock('../../state/auth', () => ({
  useAuth: () => ({ canEdit, openLogin }),
}));

function renderStar() {
  return render(<TripStateProvider><GuideStar guideId="維也納美食攻略" /></TripStateProvider>);
}

describe('GuideStar 依登入狀態上鎖', () => {
  beforeEach(() => { localStorage.clear(); openLogin.mockReset(); });
  afterEach(() => cleanup());

  it('未登入：點擊開登入、不切換、不寫本機', () => {
    canEdit = false;
    renderStar();
    const btn = screen.getByRole('button', { name: '典藏' });
    fireEvent.click(btn);
    expect(openLogin).toHaveBeenCalledTimes(1);
    expect(btn.textContent).toBe('☆');
    expect(localStorage.getItem('austria-trip-state')).toBeNull();
  });

  it('已登入：點擊切換典藏、不開登入', () => {
    canEdit = true;
    renderStar();
    const btn = screen.getByRole('button', { name: '典藏' });
    fireEvent.click(btn);
    expect(openLogin).not.toHaveBeenCalled();
    expect(btn.textContent).toBe('★');
  });

  it('點擊不冒泡到外層（避免觸發卡片展開）', () => {
    canEdit = true;
    const outer = vi.fn();
    render(
      <TripStateProvider>
        <div onClick={outer}><GuideStar guideId="維也納美食攻略" /></div>
      </TripStateProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '典藏' }));
    expect(outer).not.toHaveBeenCalled();
  });
});
