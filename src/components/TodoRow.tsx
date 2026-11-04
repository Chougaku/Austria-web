import { useState, type FormEvent } from 'react';
import type { TodoItem } from '../data/schema';
import { deleteItem, updateTodo } from '../api/add';
import { deletedKey, markDeleted, markTodoRenamed } from '../lib/deleted';
import DeleteButton from './DeleteButton';

/** 首頁出發前待辦的一行：勾選、登入後可以改字（鉛筆）和刪除。
    text 是現在要顯示的字（網站重建前改過的字先顯示新的）；todo.text 是建置時的原文（勾選狀態、藏起來都用它當 key）。 */
export default function TodoRow({ todo, text, on, canEdit, onToggle, onLogin }: {
  todo: TodoItem;
  text: string;
  on: boolean;
  canEdit: boolean;
  onToggle: () => void;
  onLogin: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const next = draft.trim();
    if (!next) { setError('請填待辦內容'); return; }
    if (next === text) { setEditing(false); return; }
    setBusy(true); setError(null);
    try {
      await updateTodo(text, next);
      markTodoRenamed(text, next);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改失敗');
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <form className="dash-bottom todo-add todo-edit" onSubmit={save} aria-label="修改待辦">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={busy} maxLength={120}
          aria-label="待辦內容" autoFocus />
        <button type="button" className="btn-plain add-form-btn" disabled={busy}
          onClick={() => { setEditing(false); setDraft(text); setError(null); }}>取消</button>
        <button type="submit" className="btn-plain add-form-btn add-form-btn--primary" disabled={busy}>
          {busy ? '儲存中…' : '儲存'}
        </button>
        {error && (
          <div role="alert" className="plan-msg plan-msg--err todo-add-err">
            <span className="plan-msg-mark" aria-hidden="true">！</span>{error}
          </div>
        )}
      </form>
    );
  }

  return (
    <div className="dash-bottom todo-row">
      <button className="btn-plain"
        style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', textAlign: 'left', opacity: canEdit ? 1 : 0.6 }}
        onClick={() => (canEdit ? onToggle() : onLogin())}>
        <span style={{
          flex: 'none', width: 20, height: 20, borderRadius: 4,
          border: `1.6px solid ${on ? 'var(--green)' : 'rgba(34,32,28,.4)'}`,
          background: on ? 'var(--green)' : 'transparent', color: '#F8F5EE',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
        }}>{on ? '✓' : ''}</span>
        <span style={{ fontSize: 13.5, color: on ? 'var(--brown)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}>{text}</span>
      </button>
      {canEdit && (
        <button type="button" className="btn-plain del-btn" aria-label={`修改「${text}」`} title="修改"
          onClick={() => { setDraft(text); setEditing(true); }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />
          </svg>
        </button>
      )}
      <DeleteButton name={text} confirmText={`確定刪除待辦「${text}」？`}
        onDelete={async () => { await deleteItem({ kind: 'todo', text }); markDeleted(deletedKey.todo(todo.text)); }} />
    </div>
  );
}
