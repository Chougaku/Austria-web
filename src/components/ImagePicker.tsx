import { useRef, useState } from 'react';
import { prepareImage, type PreparedImage } from '../lib/image-file';

export interface PickedImage extends PreparedImage { id: number }

let seq = 0;

/** 新增表單裡的「加入照片」：選圖後先在瀏覽器縮好、顯示縮圖，送出表單時才上傳。 */
export default function ImagePicker({ images, onChange, max, disabled }: {
  images: PickedImage[];
  onChange: (next: PickedImage[]) => void;
  max: number;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (files: FileList | null) => {
    const list = [...(files ?? [])];
    if (inputRef.current) inputRef.current.value = ''; // 同一張再選一次也要觸發
    if (list.length === 0) return;
    const room = max - images.length;
    setBusy(true);
    setError(list.length > room ? `最多 ${max} 張，多選的略過了` : null);
    const added: PickedImage[] = [];
    for (const f of list.slice(0, room)) {
      try { added.push({ id: ++seq, ...(await prepareImage(f)) }); }
      catch (e) { setError(e instanceof Error ? e.message : '圖片讀不了'); }
    }
    onChange([...images, ...added]);
    setBusy(false);
  };

  return (
    <div className="img-picker">
      {images.map((img, i) => (
        <div key={img.id} className="img-thumb">
          <img src={img.thumb} alt={`第 ${i + 1} 張`} />
          {i === 0 && max > 1 && <span className="img-thumb-tag">封面</span>}
          <button type="button" aria-label={`移除第 ${i + 1} 張`} disabled={disabled}
            onClick={() => onChange(images.filter((x) => x.id !== img.id))}>✕</button>
        </div>
      ))}
      {images.length < max && (
        <button type="button" className="btn-plain img-add" disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}>
          {busy ? '處理中…' : '＋ 照片'}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple={max > 1} className="visually-hidden"
        tabIndex={-1} aria-label="選擇照片" onChange={(e) => onPick(e.target.files)} />
      {error && <span className="img-picker-err" role="alert">{error}</span>}
    </div>
  );
}
