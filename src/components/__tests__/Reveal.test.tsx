// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Reveal from '../Reveal';

describe('Reveal', () => {
  it('渲染子內容並依 index 設定 --reveal-delay', () => {
    render(<Reveal index={2}><span>內容</span></Reveal>);
    const el = screen.getByText('內容').parentElement!;
    expect(el.style.getPropertyValue('--reveal-delay')).toBe('120ms');
    // jsdom 無 IntersectionObserver → useReveal 直接標記進場
    expect(el.classList.contains('reveal--in')).toBe(true);
  });

  it('delay 上限 300ms', () => {
    render(<Reveal index={99}><span>晚來的</span></Reveal>);
    const el = screen.getByText('晚來的').parentElement!;
    expect(el.style.getPropertyValue('--reveal-delay')).toBe('300ms');
  });
});
