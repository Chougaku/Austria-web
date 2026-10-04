// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import DioramaScene from '../DioramaScene';

describe('DioramaScene 立體地景', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('底圖帶 alt 與 900w／1600w 兩種尺寸，動畫層對輔助科技隱藏', () => {
    const { container } = render(<DioramaScene />);
    const img = screen.getByRole('img', { name: /微縮立體地景/ });
    expect(img.getAttribute('srcset')).toMatch(/diorama-900\.webp 900w, .*diorama-1600\.webp 1600w/);
    const svg = container.querySelector('svg.ov-diorama-fx')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelectorAll('.dio-cabin')).toHaveLength(15);
  });

  it('掛載時就擺到 t = 0 的位置；沒有 IntersectionObserver 也不會壞', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(<DioramaScene />);
    const moved = [...container.querySelectorAll('svg g[transform]')].map((g) => g.getAttribute('transform'));
    expect(moved.some((tr) => tr?.startsWith('translate('))).toBe(true);
    // 遠處那台車一開始藏著
    const far = [...container.querySelectorAll('image')].find((i) => i.getAttribute('href')?.endsWith('carFar.webp'))!;
    expect((far.parentElement as unknown as SVGGElement).style.display).toBe('none');
  });

  it('使用者設定減少動態：只擺好靜態位置，不跑動畫迴圈', () => {
    const raf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }));
    render(<DioramaScene />);
    expect(raf).not.toHaveBeenCalled();
  });
});
