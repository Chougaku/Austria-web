import { useRef, useState, type FormEvent } from 'react';
import { addGuide, uploadImage } from '../api/add';
import { uploadAll } from '../lib/image-file';
import { AddFormFooter } from './AddFlow';
import ImagePicker, { type PickedImage } from './ImagePicker';

const MAX_IMAGES = 10;

/** 登入後新增攻略：在 vault 的 原始資料/別人行程/ 建一篇（標題就是檔名），網站重建後出現在攻略頁。 */
export default function AddGuide({ onCancel, onAdded }: { onCancel: () => void; onAdded: (title: string) => void }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState<string>();
  const uploaded = useRef(new Map<number, string>());
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) { setError('請填標題'); titleRef.current?.focus(); return; }
    if (!body.trim()) { setError('請填內容'); bodyRef.current?.focus(); return; }
    if (url.trim() && !/^https?:\/\/\S+$/i.test(url.trim())) { setError('網址要以 http:// 或 https:// 開頭'); return; }
    setBusy(true); setError(null);
    try {
      const files = await uploadAll(images, uploadImage, uploaded.current, (i) => setBusyText(`上傳圖片 ${i + 1}/${images.length}…`));
      setBusyText('新增中…');
      await addGuide({ title: t, author, url: url.trim(), body, images: files });
      onAdded(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增失敗');
      setBusy(false);
    }
  };

  return (
    <form className="card add-form" onSubmit={onSubmit} aria-label="新增攻略" noValidate>
      <label className="add-form-wide">
        標題（必填）
        <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy}
          placeholder="例：維也納咖啡館私房清單" autoFocus />
      </label>
      <label>
        作者／來源
        <input value={author} onChange={(e) => setAuthor(e.target.value)} disabled={busy} placeholder="例：小明的部落格" />
      </label>
      <label>
        原文網址
        <input type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} disabled={busy} placeholder="https://…" />
      </label>
      <label className="add-form-wide">
        內容（必填）
        <textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} disabled={busy} rows={8}
          placeholder={'貼上攻略內容。可以用 markdown：\n## 小標題\n- 清單項目'} />
      </label>
      <div className="add-form-wide add-form-field">
        <span>圖片（最多 {MAX_IMAGES} 張，接在內容後面）</span>
        <ImagePicker images={images} onChange={setImages} max={MAX_IMAGES} disabled={busy} />
      </div>
      <AddFormFooter error={error} busy={busy} busyText={busyText} submitLabel="新增攻略" onCancel={onCancel} />
    </form>
  );
}
