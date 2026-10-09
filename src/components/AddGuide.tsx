import { useRef, useState, type FormEvent } from 'react';
import { addGuide } from '../api/add';
import { AddFormFooter } from './AddFlow';

/** 登入後新增攻略：在 vault 的 原始資料/別人行程/ 建一篇（標題就是檔名），網站重建後出現在攻略頁。 */
export default function AddGuide({ onCancel, onAdded }: { onCancel: () => void; onAdded: (title: string) => void }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
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
      await addGuide({ title: t, author, url: url.trim(), body });
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
      <AddFormFooter error={error} busy={busy} submitLabel="新增攻略" onCancel={onCancel} />
    </form>
  );
}
