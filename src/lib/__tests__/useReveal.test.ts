// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useReveal } from '../useReveal';

function mountWithRef(ref: (el: HTMLElement | null) => void) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  ref(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('useReveal', () => {
  it('無 IntersectionObserver（jsdom）時直接標記為已進場', () => {
    const { result } = renderHook(() => useReveal());
    const el = mountWithRef(result.current);
    expect(el.classList.contains('reveal--in')).toBe(true);
  });

  it('有 IntersectionObserver 時先加 reveal，交叉後加 reveal--in 並解除觀察', () => {
    let capturedCb: IntersectionObserverCallback = () => {};
    const unobserve = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: IntersectionObserverCallback) { capturedCb = cb; }
      observe() {}
      unobserve = unobserve;
      disconnect() {}
    });
    const { result } = renderHook(() => useReveal());
    const el = mountWithRef(result.current);
    expect(el.classList.contains('reveal')).toBe(true);
    expect(el.classList.contains('reveal--in')).toBe(false);
    capturedCb([{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(el.classList.contains('reveal--in')).toBe(true);
    expect(unobserve).toHaveBeenCalled();
  });
});
