import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  guideImageKey,
  imageKey,
  toPublicUrl,
  embedsToImageMarkdown,
  entityImageUrl,
  collectEntityImageFiles,
  rewriteImageUrls,
} from '../guide-images';

describe('guideImageKey', () => {
  it('用父資料夾＋檔名組 key', () => {
    expect(guideImageKey('/v/原始資料/attachments/threads-zsf4315/image_01.webp'))
      .toBe('austria/guides/threads-zsf4315/image_01.webp');
    expect(guideImageKey('/v/assets/threads-post/image1.jpg'))
      .toBe('austria/guides/threads-post/image1.jpg');
  });
});

describe('rewriteImageUrls', () => {
  const toUrl = (src: string) => (src.startsWith('http') ? null : `https://cdn.test/${src.split('/').pop()}`);

  it('改寫可解析的圖片 src', () => {
    expect(rewriteImageUrls('![a](../x/img.jpg)', toUrl)).toBe('![a](https://cdn.test/img.jpg)');
  });

  it('保留 alt 文字', () => {
    expect(rewriteImageUrls('![封面](image1.jpg)', toUrl)).toBe('![封面](https://cdn.test/image1.jpg)');
  });

  it('srcToUrl 回 null 時原樣保留（含已是 http 的）', () => {
    expect(rewriteImageUrls('![a](https://x.com/y.jpg)', toUrl)).toBe('![a](https://x.com/y.jpg)');
  });

  it('一般連結（非圖片）不動', () => {
    expect(rewriteImageUrls('[連結](page.md)', toUrl)).toBe('[連結](page.md)');
  });

  it('多張圖片皆改寫', () => {
    const out = rewriteImageUrls('![](a/1.jpg)\n\n![x](b/2.webp)', toUrl);
    expect(out).toBe('![](https://cdn.test/1.jpg)\n\n![x](https://cdn.test/2.webp)');
  });
});

describe('embedsToImageMarkdown', () => {
  it('圖片嵌入轉標準 markdown（含中文檔名）', () => {
    expect(embedsToImageMarkdown('![[a.jpg]]')).toBe('![](a.jpg)');
    expect(embedsToImageMarkdown('![[OEBB-Railjet-路線圖.jpg]]')).toBe('![](OEBB-Railjet-路線圖.jpg)');
  });
  it('丟棄 |尺寸 與 #anchor', () => {
    expect(embedsToImageMarkdown('![[a.png|300]]')).toBe('![](a.png)');
    expect(embedsToImageMarkdown('![[dir/b.gif#x]]')).toBe('![](dir/b.gif)');
  });
  it('副檔名大小寫皆可', () => {
    expect(embedsToImageMarkdown('![[a.JPG]]')).toBe('![](a.JPG)');
  });
  it('非圖片嵌入（無圖片副檔名）不轉', () => {
    expect(embedsToImageMarkdown('![[某筆記]]')).toBe('![[某筆記]]');
  });
});

describe('imageKey', () => {
  it('entities key 為純 ASCII（保留 ASCII 片段 + 8 碼雜湊 + 副檔名）', () => {
    const k = imageKey('/v/assets/交通/OEBB-Railjet-路線圖.jpg', 'entities');
    expect(k).toMatch(/^austria\/entities\/OEBB-Railjet-[0-9a-f]{8}\.jpg$/);
    expect(k).toMatch(/^[\x20-\x7E]+$/); // 全 ASCII
  });
  it('entities key 穩定（不因路徑前綴而變）、不同檔名不同；純中文檔名只剩雜湊', () => {
    const a = imageKey('/x/assets/交通/維也納地鐵-路線圖.gif', 'entities');
    const b = imageKey('/y/z/assets/交通/維也納地鐵-路線圖.gif', 'entities');
    const c = imageKey('/x/assets/交通/慕尼黑MVV-範圍地圖.png', 'entities');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^austria\/entities\/[0-9a-f]{8}\.gif$/);
  });
  it('guideImageKey 等於 imageKey(…, guides)（輸出不回歸）', () => {
    const abs = '/v/原始資料/attachments/threads-zsf4315/image_01.webp';
    expect(guideImageKey(abs)).toBe(imageKey(abs, 'guides'));
    expect(guideImageKey(abs)).toBe('austria/guides/threads-zsf4315/image_01.webp');
  });
});

describe('toPublicUrl', () => {
  it('中文路徑逐段百分比編碼，/ 不編', () => {
    const key = 'austria/entities/交通/OEBB-Railjet-路線圖.jpg';
    expect(toPublicUrl('https://img.example.com', key)).toBe(
      'https://img.example.com/austria/entities/' +
        encodeURIComponent('交通') + '/' + encodeURIComponent('OEBB-Railjet-路線圖.jpg'),
    );
  });
  it('ASCII 不變、末段 - . _ 不編', () => {
    expect(toPublicUrl('https://x', 'a/b/c-d_e.png')).toBe('https://x/a/b/c-d_e.png');
  });
});

describe('entityImageUrl / collectEntityImageFiles（暫存 vault）', () => {
  function makeVault(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-'));
    fs.mkdirSync(path.join(root, 'assets/交通'), { recursive: true });
    fs.mkdirSync(path.join(root, 'wiki/entities/交通'), { recursive: true });
    fs.writeFileSync(path.join(root, 'assets/交通/foo.png'), 'x');
    fs.writeFileSync(
      path.join(root, 'wiki/entities/交通/X.md'),
      '---\ntitle: X\n---\n\n介紹\n\n![[foo.png]]\n',
    );
    return root;
  }

  it('entityImageUrl 解析到 assets 內的圖並組純 ASCII 網址', () => {
    const root = makeVault();
    const assetRoots = [path.join(root, 'assets'), path.join(root, '原始資料/attachments')];
    const dir = path.join(root, 'wiki/entities/交通');
    const url = entityImageUrl('foo.png', dir, assetRoots, 'https://img.example.com');
    expect(url).toMatch(/^https:\/\/img\.example\.com\/austria\/entities\/foo-[0-9a-f]{8}\.png$/);
    expect(url).toMatch(/^[\x20-\x7E]+$/); // 全 ASCII
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('解析不到回 null', () => {
    const root = makeVault();
    const dir = path.join(root, 'wiki/entities/交通');
    expect(entityImageUrl('missing.png', dir, [path.join(root, 'assets')], 'https://x')).toBeNull();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('collectEntityImageFiles 掃出 entity 圖片（ASCII key → 絕對路徑）', () => {
    const root = makeVault();
    const assetRoots = [path.join(root, 'assets'), path.join(root, '原始資料/attachments')];
    const files = collectEntityImageFiles(root, assetRoots);
    const abs = path.join(root, 'assets/交通/foo.png');
    const key = imageKey(abs, 'entities');
    expect(key).toMatch(/^austria\/entities\/foo-[0-9a-f]{8}\.png$/);
    expect(files.get(key)).toBe(abs);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
