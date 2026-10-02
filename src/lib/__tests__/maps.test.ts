import { describe, it, expect } from 'vitest';
import { googleMapsUrl } from '../maps';

const PREFIX = 'https://www.google.com/maps/search/?api=1&query=';

describe('googleMapsUrl', () => {
  it('已知區域補上拉丁地名（搜尋最準）並正確編碼', () => {
    expect(googleMapsUrl('Café Sacher', '維也納')).toBe(PREFIX + encodeURIComponent('Café Sacher Wien'));
    expect(googleMapsUrl('Seewalchen', '哈修塔特')).toBe(PREFIX + encodeURIComponent('Seewalchen Hallstatt'));
  });

  it('店名已經帶了地名就不重複補', () => {
    expect(googleMapsUrl('Café Sacher Wien', '維也納')).toBe(PREFIX + encodeURIComponent('Café Sacher Wien'));
  });

  it('不認得的區域原樣附上', () => {
    expect(googleMapsUrl('Gasthof Post', 'Lofer')).toBe(PREFIX + encodeURIComponent('Gasthof Post Lofer'));
  });

  it('沒有區域就只搜店名', () => {
    expect(googleMapsUrl('Figlmüller', '')).toBe(PREFIX + encodeURIComponent('Figlmüller'));
    expect(googleMapsUrl('Figlmüller')).toBe(PREFIX + encodeURIComponent('Figlmüller'));
  });

  it('空白與特殊字元被編碼（結果不含原始空白）', () => {
    const url = googleMapsUrl('Hofbräuhaus (Platzl)', '慕尼黑');
    expect(url.startsWith(PREFIX)).toBe(true);
    expect(url).not.toContain(' ');
  });
});
