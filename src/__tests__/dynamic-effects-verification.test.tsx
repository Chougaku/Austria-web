// @vitest-environment jsdom
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TripStateProvider } from '../state/store';
import { AuthProvider } from '../state/auth';
import App from '../App';
import Stamp from '../components/Stamp';
import AreaMap from '../pages/AreaMap';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

afterEach(() => {
  cleanup();
  location.hash = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <AuthProvider>
      <TripStateProvider>
        {ui}
      </TripStateProvider>
    </AuthProvider>,
  );
}

describe('Dynamic Effects Verification', () => {
  describe('1. Stamp Ink Bleed (蓋章墨暈)', () => {
    it('未蓋態 (rating == null) 時為 .stamp--off 且無 .stamp--pop', () => {
      const { container } = render(<Stamp rating={null} />);
      const stampEl = container.querySelector('.stamp');
      expect(stampEl?.classList.contains('stamp--off')).toBe(true);
      expect(stampEl?.classList.contains('stamp--pop')).toBe(false);
    });

    it('評分由 null 轉為有數值時（從未蓋到已蓋），觸發 .stamp--pop Class', () => {
      const { container, rerender } = render(<Stamp rating={null} />);
      const stampEl = container.querySelector('.stamp');
      expect(stampEl?.classList.contains('stamp--pop')).toBe(false);

      rerender(<Stamp rating={4.8} />);
      expect(stampEl?.classList.contains('stamp--pop')).toBe(true);

      // 動畫結束後移除 pop class
      fireEvent.animationEnd(stampEl!);
      expect(stampEl?.classList.contains('stamp--pop')).toBe(false);
    });

    it('初始就有評分時，不觸發 .stamp--pop 動畫', () => {
      const { container } = render(<Stamp rating={4.8} />);
      const stampEl = container.querySelector('.stamp');
      expect(stampEl?.classList.contains('stamp--pop')).toBe(false);
    });
  });

  describe('2. AreaRail Vertical Line Unfold (AreaRail 縱線揭開)', () => {
    it('掛載時連結 useReveal，並在交叉進場後加上 reveal--in', () => {
      let observerCb: IntersectionObserverCallback = () => {};
      const unobserve = vi.fn();
      vi.stubGlobal('IntersectionObserver', class {
        constructor(cb: IntersectionObserverCallback) { observerCb = cb; }
        observe() {}
        unobserve = unobserve;
        disconnect() {}
      });

      const { container } = renderWithProviders(<AreaMap />);
      const railEl = container.querySelector('.area-rail');
      expect(railEl).not.toBeNull();
      expect(railEl?.classList.contains('reveal')).toBe(true);
      expect(railEl?.classList.contains('reveal--in')).toBe(false);

      // 觸發視窗進場
      act(() => {
        observerCb([{ isIntersecting: true, target: railEl! } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
      });

      expect(railEl?.classList.contains('reveal--in')).toBe(true);
      expect(container.querySelectorAll('.area-rail-line').length).toBeGreaterThan(0);
      expect(container.querySelectorAll('.area-rail-dot').length).toBeGreaterThan(0);
    });
  });

  // 回歸：曾用 View Transitions 做分頁切換，但 `::view-transition-group()` 的預設 250ms
  // 幾何 morph 無法只靠覆寫 old/new 關掉，sticky header 與長短差很多的頁面（首頁 910px
  // vs 餐廳 3800px）會被拉伸位移，看起來就是頁首晃動、切換卡頓。改回單純的 .page-enter 淡入。
  describe('3. 分頁切換不使用 View Transitions', () => {
    it('切換 hash 時不呼叫 startViewTransition', () => {
      const startViewTransitionMock = vi.fn((cb: () => void) => {
        cb();
        return { finished: Promise.resolve(), ready: Promise.resolve(), updateCallbackDone: Promise.resolve() };
      });
      document.startViewTransition = startViewTransitionMock as any;

      renderWithProviders(<App />);

      act(() => {
        location.hash = '#food';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(startViewTransitionMock).not.toHaveBeenCalled();
    });

    it('切換 hash 仍會換頁', () => {
      const { container } = renderWithProviders(<App />);

      act(() => {
        location.hash = '#food';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(container.querySelector('.page-enter')).not.toBeNull();
    });

    it('CSS 不再宣告 view-transition-name（幾何 morph 的來源）', () => {
      // vitest 預設不處理 CSS，`?raw` 會回空字串，所以直接讀檔。
      const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
      expect(styles.length).toBeGreaterThan(1000);
      expect(styles).not.toMatch(/view-transition-name/);
      expect(styles).not.toMatch(/::view-transition/);
    });
  });

  // 回歸：地圖與每日行程不到一屏、沒有垂直捲軸，其餘分頁都有，桌機視口因此差 15px，
  // 切過去時頁首右上角（出發倒數、登入編輯）會橫跳。保留捲軸槽讓每頁寬度一致。
  describe('4. 分頁間版面寬度穩定', () => {
    it('CSS 用 scrollbar-gutter: stable 保留捲軸槽', () => {
      const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
      expect(styles).toMatch(/scrollbar-gutter:\s*stable/);
    });
  });
});

