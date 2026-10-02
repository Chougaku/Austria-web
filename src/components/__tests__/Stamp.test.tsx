// @vitest-environment jsdom
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Stamp from '../Stamp';

afterEach(cleanup);

describe('Stamp', () => {
  it('未蓋態 (rating == null) 渲染 stamp--off，不含 stamp--pop', () => {
    const { container } = render(<Stamp rating={null} />);
    const el = container.querySelector('.stamp');
    expect(el?.classList.contains('stamp--off')).toBe(true);
    expect(el?.classList.contains('stamp--pop')).toBe(false);
  });

  it('初始既有分數渲染 stamp，初始不觸發 stamp--pop', () => {
    const { container } = render(<Stamp rating={4.5} />);
    const el = container.querySelector('.stamp');
    expect(el?.classList.contains('stamp--off')).toBe(false);
    expect(el?.classList.contains('stamp--pop')).toBe(false);
  });

  it('rating 由 null 變更為數值時，觸發 stamp--pop', () => {
    const { container, rerender } = render(<Stamp rating={null} />);
    const el = container.querySelector('.stamp');
    expect(el?.classList.contains('stamp--off')).toBe(true);
    expect(el?.classList.contains('stamp--pop')).toBe(false);

    rerender(<Stamp rating={5.0} />);
    expect(el?.classList.contains('stamp--off')).toBe(false);
    expect(el?.classList.contains('stamp--pop')).toBe(true);
  });
});
