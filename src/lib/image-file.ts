/** 上傳前在瀏覽器裡縮圖：長邊最多 1600px、轉 JPEG。手機照片動輒 3–5 MB，縮完約 200–400 KB，
    vault 不會被撐大，網站也載得快。另做一張小縮圖（data URL）給表單預覽、網站重建前的行程畫面用。 */
export interface PreparedImage { blob: Blob; thumb: string }

const MAX_SIDE = 1600;
const THUMB_SIDE = 320;

type Source = ImageBitmap | HTMLImageElement;

async function decode(file: Blob): Promise<Source> {
  if (typeof createImageBitmap === 'function') {
    // 照 EXIF 轉正：手機直拍的照片不會躺著
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* 退回 <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { URL.revokeObjectURL(url); }
}

const sizeOf = (s: Source) => ('naturalWidth' in s ? [s.naturalWidth, s.naturalHeight] : [s.width, s.height]);

function draw(src: Source, max: number): HTMLCanvasElement {
  const [w, h] = sizeOf(src);
  const k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('瀏覽器不支援圖片處理');
  // PNG 透明的地方轉 JPEG 會變黑，先鋪白底
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (file.type && !file.type.startsWith('image/')) throw new Error(`「${file.name}」不是圖片`);
  let src: Source;
  try { src = await decode(file); }
  catch { throw new Error(`「${file.name}」讀不了，iPhone 的 HEIC 請先轉成 JPG 再選`); }
  try {
    const blob = await new Promise<Blob>((resolve, reject) =>
      draw(src, MAX_SIDE).toBlob((b) => (b ? resolve(b) : reject(new Error('圖片轉檔失敗'))), 'image/jpeg', 0.82));
    return { blob, thumb: draw(src, THUMB_SIDE).toDataURL('image/jpeg', 0.7) };
  } finally {
    if ('close' in src) src.close();
  }
}

/** 送出前依序上傳（同時送會在 GitHub 的同一個分支上互撞），回傳 vault 裡的檔名。
    已經傳過的（例如上次新增因為同名失敗、改名重送）直接沿用 done 裡的檔名，vault 不會留兩份。 */
export async function uploadAll<T extends { id: number; blob: Blob }>(
  items: T[], upload: (b: Blob) => Promise<{ id: string }>, done: Map<number, string>, onStep?: (i: number) => void,
): Promise<string[]> {
  const files: string[] = [];
  for (const [i, it] of items.entries()) {
    let file = done.get(it.id);
    if (!file) {
      onStep?.(i);
      file = (await upload(it.blob)).id;
      done.set(it.id, file);
    }
    files.push(file);
  }
  return files;
}
