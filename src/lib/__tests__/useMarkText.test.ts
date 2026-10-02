// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useMarkText } from '../useMarkText';
import type { RefObject } from 'react';

function makeContainer(html: string): RefObject<HTMLElement | null> {
  document.body.innerHTML = `<div id="c">${html}</div>`;
  return { current: document.getElementById('c') };
}

describe('useMarkText', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => cleanup());

  it('把命中文字包進 mark.search-hit（大小寫不敏感）', () => {
    const ref = makeContainer('<p>推薦 Schnitzel 薩赫蛋糕與蘋果捲</p>');
    renderHook(() => useMarkText(ref, ['schnitzel', '蘋果捲'], true));
    const marks = ref.current!.querySelectorAll('mark.search-hit');
    expect([...marks].map((m) => m.textContent)).toEqual(['Schnitzel', '蘋果捲']);
  });

  it('同一文字節點多次命中都包到', () => {
    const ref = makeContainer('<p>咖啡店旁邊還是咖啡店</p>');
    renderHook(() => useMarkText(ref, ['咖啡'], true));
    expect(ref.current!.querySelectorAll('mark.search-hit').length).toBe(2);
  });

  it('unmount 後 mark 全部還原、文字內容不變', () => {
    const ref = makeContainer('<p>推薦薩赫蛋糕</p>');
    const { unmount } = renderHook(() => useMarkText(ref, ['薩赫蛋糕'], true));
    expect(ref.current!.querySelector('mark')).toBeTruthy();
    unmount();
    expect(ref.current!.querySelector('mark')).toBeNull();
    expect(ref.current!.textContent).toBe('推薦薩赫蛋糕');
  });

  it('enabled=false 不動作', () => {
    const ref = makeContainer('<p>推薦薩赫蛋糕</p>');
    renderHook(() => useMarkText(ref, ['薩赫蛋糕'], false));
    expect(ref.current!.querySelector('mark')).toBeNull();
  });

  it('tokens 變更時重新標記', () => {
    const ref = makeContainer('<p>薩赫蛋糕與蘋果捲</p>');
    const { rerender } = renderHook(
      ({ tokens }) => useMarkText(ref, tokens, true),
      { initialProps: { tokens: ['薩赫蛋糕'] } },
    );
    expect(ref.current!.querySelector('mark')!.textContent).toBe('薩赫蛋糕');
    rerender({ tokens: ['蘋果捲'] });
    const marks = ref.current!.querySelectorAll('mark');
    expect(marks.length).toBe(1);
    expect(marks[0].textContent).toBe('蘋果捲');
  });
});
