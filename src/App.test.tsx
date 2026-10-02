import { describe, it, expect } from 'vitest';
import { parseHash } from './App';

describe('parseHash', () => {
  it('合法 tab', () => {
    expect(parseHash('#food')).toBe('food');
  });

  it('空 hash 回 home', () => {
    expect(parseHash('')).toBe('home');
  });

  it('不合法 tab 回 home', () => {
    expect(parseHash('#not-a-tab')).toBe('home');
  });

  it('舊 tab:anchor 格式回 home（跳轉管線已移除）', () => {
    expect(parseHash('#food:entity-abc')).toBe('home');
  });
});
