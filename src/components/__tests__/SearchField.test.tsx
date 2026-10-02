// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import SearchField from '../SearchField';

describe('SearchField', () => {
  afterEach(() => cleanup());

  it('受控輸入觸發 onChange', () => {
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} placeholder="搜尋…" />);
    fireEvent.change(screen.getByPlaceholderText('搜尋…'), { target: { value: '拉' } });
    expect(onChange).toHaveBeenCalledWith('拉');
  });

  it('有值時顯示清除鈕，點擊清空', () => {
    const onChange = vi.fn();
    render(<SearchField value="拉麵" onChange={onChange} placeholder="搜尋…" />);
    fireEvent.click(screen.getByLabelText('清除搜尋'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('空值時不顯示清除鈕', () => {
    render(<SearchField value="" onChange={() => {}} placeholder="搜尋…" />);
    expect(screen.queryByLabelText('清除搜尋')).toBeNull();
  });
});
