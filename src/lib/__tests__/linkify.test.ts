import { describe, it, expect } from 'vitest';
import { linkifyNote } from '../linkify';

describe('linkifyNote', () => {
  it('沒有網址就原樣一段', () => {
    expect(linkifyNote('入山費 ¥500')).toEqual([{ text: '入山費 ¥500' }]);
  });

  it('markdown 行內連結取標籤當顯示文字', () => {
    expect(linkifyNote('班表 [去程](https://ekitan.com/a) 見此')).toEqual([
      { text: '班表 ' },
      { text: '去程', href: 'https://ekitan.com/a' },
      { text: ' 見此' },
    ]);
  });

  it('裸網址也可點，文字就是網址本身', () => {
    expect(linkifyNote('見 https://ekitan.com/a')).toEqual([
      { text: '見 ' },
      { text: 'https://ekitan.com/a', href: 'https://ekitan.com/a' },
    ]);
  });

  it('備註慣用的 ・ 分隔不會被吃進網址', () => {
    expect(linkifyNote('https://ekitan.com/a・¥800')).toEqual([
      { text: 'https://ekitan.com/a', href: 'https://ekitan.com/a' },
      { text: '・¥800' },
    ]);
  });

  it('裸網址結尾的半形標點不算網址的一部分', () => {
    expect(linkifyNote('見 https://ekitan.com/a.')).toEqual([
      { text: '見 ' },
      { text: 'https://ekitan.com/a', href: 'https://ekitan.com/a' },
      { text: '.' },
    ]);
  });

  it('一段備註可以有多個連結', () => {
    const segs = linkifyNote('[去程](https://e.com/1)／[回程](https://e.com/2)');
    expect(segs.filter((s) => s.href)).toEqual([
      { text: '去程', href: 'https://e.com/1' },
      { text: '回程', href: 'https://e.com/2' },
    ]);
  });

  it('只認 http(s)，其他協定當純文字', () => {
    expect(linkifyNote('javascript:alert(1)')).toEqual([{ text: 'javascript:alert(1)' }]);
  });
});
