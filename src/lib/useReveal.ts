import { useCallback, useRef } from 'react';
import type { RefCallback } from 'react';

/** 滾動進場：掛上回傳的 ref，元素進入視窗時加 `reveal--in`。 */
export function useReveal(): RefCallback<HTMLElement> {
  const obRef = useRef<IntersectionObserver | null>(null);
  return useCallback((el) => {
    obRef.current?.disconnect();
    obRef.current = null;
    if (!el) return;
    el.classList.add('reveal');
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('reveal--in');
      return;
    }
    const ob = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('reveal--in');
        ob.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    ob.observe(el);
    obRef.current = ob;
  }, []);
}
