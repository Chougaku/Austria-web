import { useState, type FormEvent } from 'react';
import { addTodo } from '../api/add';

/** 登入後新增出發前待辦：Worker 在 vault 行程筆記的待辦段落最後補一行，網站重建後出現在清單裡。 */
export default function AddTodo({ onCancel, onAdded }: { onCancel: () => void; onAdded: (text: string) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) { setError('請填待辦內容'); return; }
    setBusy(true); setError(null);
    try {
      await addTodo(t);
      onAdded(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增失敗');
      setBusy(false);
    }
  };

  return (
    <form className="todo-add" onSubmit={onSubmit} aria-label="新增待辦">
      <input value={text} onChange={(e) => setText(e.target.value)} disabled={busy} maxLength={120}
        placeholder="例：換一些歐元現金" aria-label="待辦內容" autoFocus />
      <button type="button" className="btn-plain add-form-btn" onClick={onCancel} disabled={busy}>取消</button>
      <button type="submit" className="btn-plain add-form-btn add-form-btn--primary" disabled={busy}>
        {busy ? '新增中…' : '新增'}
      </button>
      {error && (
        <div role="alert" className="plan-msg plan-msg--err todo-add-err">
          <span className="plan-msg-mark" aria-hidden="true">！</span>{error}
        </div>
      )}
    </form>
  );
}
