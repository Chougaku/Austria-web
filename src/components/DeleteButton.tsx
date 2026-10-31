import { useState, type MouseEvent } from 'react';
import { useAuth } from '../state/auth';

/** 登入後才出現的刪除鈕：先跳確認，刪除成功後由呼叫端把項目藏起來（這個按鈕跟著卡片一起消失）。 */
export default function DeleteButton({ name, confirmText, onDelete }: {
  name: string;
  confirmText: string;
  onDelete: () => Promise<void>;
}) {
  const { canEdit } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!canEdit) return null;

  const onClick = async (e: MouseEvent) => {
    e.stopPropagation(); // 攻略卡片的標題列點了會展開
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    try { await onDelete(); }
    catch (err) {
      window.alert(err instanceof Error ? err.message : '刪除失敗');
      setBusy(false);
    }
  };

  return (
    <button type="button" className="btn-plain del-btn" aria-label={`刪除「${name}」`} title="刪除"
      disabled={busy} onClick={onClick}>
      {busy ? '…' : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
        </svg>
      )}
    </button>
  );
}
