import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseItinerary } from '../parse-itinerary';
import { serializeDays } from '../../../src/lib/itinerary-md';
import { publishLocalImage } from '../guide-images';
import { parseEntity } from '../parse-entity';
import { entityMarkdown } from '../../../worker/src/entity';

const plan = (lines: string) => `---\ntitle: 每日行程\n---\n\n## Day 1｜06/15 週二｜維也納\n> 區域：維也納\n\n${lines}\n`;

describe('每日行程的時段圖片', () => {
  it('把 ![[檔名]] 與 ![](網址) 從時段拆出來，備註不留殘渣', () => {
    const [d] = parseItinerary(plan([
      '- 上午｜美泉宮｜先買票 ![[20261029-3fa9c1d2.jpg]] ![[20261029-0b1c2d3e.png|300]]',
      '- 下午｜咖啡館｜ ![](https://example.com/a.jpg)',
      '- 晚上｜（待安排） ![[20261029-aaaaaaaa.jpg]]',
    ].join('\n')));
    expect(d.slots[0]).toEqual({
      time: '上午', title: '美泉宮', note: '先買票', pending: false,
      images: [{ file: '20261029-3fa9c1d2.jpg', url: '20261029-3fa9c1d2.jpg' }, { file: '20261029-0b1c2d3e.png', url: '20261029-0b1c2d3e.png' }],
    });
    expect(d.slots[1].note).toBe('');
    expect(d.slots[1].images).toEqual([{ file: 'https://example.com/a.jpg', url: 'https://example.com/a.jpg' }]);
    expect(d.slots[2]).toEqual({ time: '晚上', title: '（待安排）', note: '', pending: true });
  });

  it('沒圖片的時段不多出 images 欄位', () => {
    expect(parseItinerary(plan('- 上午｜美泉宮'))[0].slots[0]).toEqual({ time: '上午', title: '美泉宮', note: '', pending: false });
  });

  it('寫回 vault：圖片接在備註後面，讀回來一樣；網站網址不會寫進 vault', () => {
    const md = '- 上午｜美泉宮｜先買票 ![[20261029-3fa9c1d2.jpg]]\n- 下午｜咖啡館｜![](https://example.com/a.jpg)';
    const days = parseItinerary(plan(md));
    days[0].slots[0].images![0].url = 'vault-img/20261029-3fa9c1d2-1234abcd.jpg'; // 建置時換成網站網址
    const out = serializeDays(days);
    expect(out).toContain('- 上午｜美泉宮｜先買票 ![[20261029-3fa9c1d2.jpg]]');
    expect(out).toContain('- 下午｜咖啡館｜![](https://example.com/a.jpg)');
    expect(out).not.toContain('vault-img');
    expect(parseItinerary(`# x\n\n${out}`)[0].slots.map((s) => s.images?.map((i) => i.file))).toEqual([
      ['20261029-3fa9c1d2.jpg'], ['https://example.com/a.jpg'],
    ]);
  });

  it('只有圖片沒有備註、待安排的時段都寫得對', () => {
    const out = serializeDays([{ label: 'Day 1', date: '06/15 週二', theme: 't', areas: [], slots: [
      { time: '上午', title: '美泉宮', note: '', pending: false, images: [{ file: '20261029-3fa9c1d2.jpg', url: 'data:x' }] },
      { time: '下午', title: '（待安排）', note: '', pending: true, images: [{ file: '20261029-0b1c2d3e.jpg', url: 'data:y' }] },
    ] }]);
    expect(out).toContain('- 上午｜美泉宮｜![[20261029-3fa9c1d2.jpg]]\n');
    expect(out).toContain('- 下午｜（待安排）\n');
  });
});

describe('建置時把 vault 圖片放進網站', () => {
  let tmp = '';
  afterEach(() => { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

  it('複製到 public/vault-img/，回傳純 ASCII 的相對網址', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-img-'));
    const src = path.join(tmp, 'vault', 'assets', '美泉宮 photo.jpg');
    fs.mkdirSync(path.dirname(src), { recursive: true });
    fs.writeFileSync(src, 'jpeg-bytes');
    const url = publishLocalImage(src, path.join(tmp, 'public'));
    expect(url).toMatch(/^vault-img\/photo-[0-9a-f]{8}\.jpg$/);
    expect(fs.readFileSync(path.join(tmp, 'public', url), 'utf8')).toBe('jpeg-bytes');
    expect(publishLocalImage(src, path.join(tmp, 'public'))).toBe(url); // 同一張只放一次、網址穩定
  });
});

describe('網站新增的地點照片', () => {
  it('照片段落讀得到圖、簡介不受影響', () => {
    const e = parseEntity('景點', 'x.md', entityMarkdown({
      category: '景點', name: '美景宮', type: '', city: '', location: '', address: '', ticket: '', price: '',
      summary: '上美景宮看克林姆。', images: ['20261029-3fa9c1d2.jpg'],
    }, '2026-10-29'));
    expect(e.summary).toBe('上美景宮看克林姆。');
    expect(e.body).toContain('![](20261029-3fa9c1d2.jpg)');
  });
});
