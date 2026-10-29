import { useRef, useState } from 'react';
import type { SlotImage } from '../data/schema';
import { prepareImage } from '../lib/image-file';
import { uploadImage } from '../api/add';

const MAX = 10;

/** 每日行程的時段照片（檢視用）：點開看大圖。剛上傳、網站還沒重建的是本機縮圖，不給連結。 */
export function SlotPhotos({ images }: { images: SlotImage[] }) {
  return (
    <div className="plan-imgs">
      {images.map((img, i) => (img.url.startsWith('data:')
        ? <img key={i} src={img.url} alt={`照片 ${i + 1}`} />
        : (
          <a key={i} href={img.url} target="_blank" rel="noreferrer" aria-label={`看大圖：照片 ${i + 1}`}>
            <img src={img.url} alt={`照片 ${i + 1}`} loading="lazy" />
          </a>
        )))}
    </div>
  );
}

/** 編輯時段的照片：選了就在瀏覽器縮圖、馬上傳進 vault（這一步不會重建網站），按「儲存並提交」才寫進行程檔。
    畫面先用本機縮圖預覽，網站重建後換成正式的圖。 */
export default function SlotImages({ images, onChange, disabled }: {
  images: SlotImage[];
  onChange: (next: SlotImage[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (files: FileList | null) => {
    const list = [...(files ?? [])];
    if (inputRef.current) inputRef.current.value = '';
    if (list.length === 0) return;
    const room = MAX - images.length;
    setBusy(true);
    setError(list.length > room ? `每個時段最多 ${MAX} 張，多選的略過了` : null);
    let next = images;
    for (const f of list.slice(0, room)) {
      try {
        const p = await prepareImage(f);
        const { id } = await uploadImage(p.blob);
        next = [...next, { file: id, url: p.thumb }];
        onChange(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : '照片上傳失敗');
        break;
      }
    }
    setBusy(false);
  };

  return (
    <div className="slot-imgs">
      {images.map((img, i) => (
        <div key={`${img.file}-${i}`} className="img-thumb img-thumb--sm">
          <img src={img.url} alt={`照片 ${i + 1}`} />
          <button type="button" aria-label={`移除照片 ${i + 1}`} disabled={busy}
            onClick={() => onChange(images.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      {images.length < MAX && (
        <button type="button" className="btn-plain img-add img-add--sm" disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}>
          {busy ? '上傳中…' : '＋ 照片'}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple className="visually-hidden"
        tabIndex={-1} aria-label="選擇時段照片" onChange={(e) => onPick(e.target.files)} />
      {error && <span className="img-picker-err" role="alert">{error}</span>}
    </div>
  );
}
