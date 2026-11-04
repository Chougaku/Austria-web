import { useRef, useState, type FormEvent } from 'react';
import type { Guide, ImageRef } from '../data/schema';
import { addGuide, updateGuide, uploadImage, type GuideRaw, type GuideUpdate } from '../api/add';
import { uploadAll } from '../lib/image-file';
import { AddFormFooter } from './AddFlow';
import ImagePicker, { type PickedImage } from './ImagePicker';

const MAX_IMAGES = 10;

/** 網站還沒重建、對不到網址的圖（剛上傳的）先用灰色小方塊代替。 */
const PENDING_THUMB = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 76"><rect width="76" height="76" fill="#e8e1d2"/><text x="38" y="43" font-size="11" text-anchor="middle" fill="#8a7d68">已上傳</text></svg>')}`;

/** 新增或編輯攻略。
    新增：在 vault 的 原始資料/別人行程/ 建一篇（標題就是檔名）。
    編輯（edit）：表單帶入 vault 裡的原始內容（不是網站上建置過的版本），只送動過的欄位；改標題會換檔名。 */
export default function AddGuide({ edit, onCancel, onAdded }: {
  edit?: { guide: Guide; raw: GuideRaw };
  onCancel: () => void;
  onAdded: (title: string) => void;
}) {
  const initial = {
    title: edit?.guide.title ?? '',
    author: edit?.raw.author ?? '',
    url: edit?.raw.url ?? '',
    body: edit?.raw.body ?? '',
  };
  const existing: ImageRef[] = (edit?.raw.images ?? []).map((file) => ({
    file, url: edit?.guide.images?.find((i) => i.file === file)?.url ?? PENDING_THUMB,
  }));
  const [title, setTitle] = useState(initial.title);
  const [author, setAuthor] = useState(initial.author);
  const [url, setUrl] = useState(initial.url);
  const [body, setBody] = useState(initial.body);
  const [kept, setKept] = useState<ImageRef[]>(existing);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState<string>();
  const uploaded = useRef(new Map<number, string>());
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const verb = edit ? '儲存' : '新增';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) { setError('請填標題'); titleRef.current?.focus(); return; }
    if (!body.trim()) { setError('請填內容'); bodyRef.current?.focus(); return; }
    if (url.trim() && !/^https?:\/\/\S+$/i.test(url.trim())) { setError('網址要以 http:// 或 https:// 開頭'); return; }

    const changes: GuideUpdate['changes'] = {};
    if (edit) {
      if (t !== initial.title) changes.title = t;
      if (author.trim() !== initial.author) changes.author = author.trim();
      if (url.trim() !== initial.url) changes.url = url.trim();
      if (body.trim() !== initial.body.trim()) changes.body = body;
    }
    const keptFiles = new Set(kept.map((i) => i.file));
    const removed = existing.filter((i) => !keptFiles.has(i.file)).map((i) => i.file);
    if (edit && Object.keys(changes).length === 0 && removed.length === 0 && images.length === 0) {
      setError('沒有任何修改'); return;
    }

    setBusy(true); setError(null);
    try {
      const files = await uploadAll(images, uploadImage, uploaded.current, (i) => setBusyText(`上傳圖片 ${i + 1}/${images.length}…`));
      setBusyText(`${verb}中…`);
      if (edit) await updateGuide({ id: edit.guide.id, changes, removeImages: removed, addImages: files });
      else await addGuide({ title: t, author, url: url.trim(), body, images: files });
      onAdded(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : `${verb}失敗`);
      setBusy(false);
    }
  };

  return (
    <form className={edit ? 'add-form add-form--edit' : 'card add-form'} onSubmit={onSubmit}
      aria-label={edit ? '編輯攻略' : '新增攻略'} noValidate>
      <label className="add-form-wide">
        標題（必填）
        <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy}
          placeholder="例：維也納咖啡館私房清單" autoFocus={!edit} />
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
        <textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} disabled={busy} rows={edit ? 12 : 8}
          placeholder={'貼上攻略內容。可以用 markdown：\n## 小標題\n- 清單項目'} />
      </label>
      <div className="add-form-wide add-form-field">
        <span>圖片（最多 {MAX_IMAGES} 張，接在內容後面）</span>
        <ImagePicker images={images} onChange={setImages} max={MAX_IMAGES} disabled={busy}
          existing={kept} onRemoveExisting={(file) => setKept((k) => k.filter((i) => i.file !== file))} cover={false} />
      </div>
      <AddFormFooter error={error} busy={busy} busyText={busyText} submitLabel={edit ? '儲存' : '新增攻略'} onCancel={onCancel}
        note={edit ? '存回 vault，網站重建後（約 1–2 分鐘）就會更新' : undefined} />
    </form>
  );
}
