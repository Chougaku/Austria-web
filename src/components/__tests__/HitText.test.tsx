// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import HitText from '../HitText';

describe('HitText', () => {
  afterEach(() => cleanup());

  it('hit 片段渲染為 mark.search-hit', () => {
    const { container } = render(
      <HitText segments={[
        { text: '道頓堀', hit: false },
        { text: '拉麵', hit: true },
      ]} />,
    );
    const mark = container.querySelector('mark.search-hit');
    expect(mark?.textContent).toBe('拉麵');
    expect(container.textContent).toBe('道頓堀拉麵');
  });
});
