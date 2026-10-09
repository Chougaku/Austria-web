/** 分區標題或工具列上的「＋ 新增…」按鈕。 */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="btn-plain add-btn" onClick={onClick}>＋ 新增{label}</button>;
}

/** 新增成功的提示：內容寫進 vault 了，但網站要等重建才看得到。 */
export function AddedNotice({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <div role="status" className="plan-msg plan-msg--ok add-notice">
      <span className="plan-msg-mark" aria-hidden="true">✓</span>
      已新增{names.map((n) => `「${n}」`).join('')}，網站重建後（約 1–2 分鐘）重新整理就會出現
    </div>
  );
}

/** 表單底部：錯誤訊息＋說明＋取消／送出。 */
export function AddFormFooter({ error, busy, submitLabel, onCancel }: {
  error: string | null; busy: boolean; submitLabel: string; onCancel: () => void;
}) {
  return (
    <>
      {error && (
        <div role="alert" className="plan-msg plan-msg--err add-form-wide" style={{ marginTop: 0 }}>
          <span className="plan-msg-mark" aria-hidden="true">！</span>{error}
        </div>
      )}
      <div className="add-form-actions">
        <span className="add-form-note">存進 vault，網站重建後（約 1–2 分鐘）就會出現</span>
        <button type="button" className="btn-plain add-form-btn" onClick={onCancel} disabled={busy}>取消</button>
        <button type="submit" className="btn-plain add-form-btn add-form-btn--primary" disabled={busy}>
          {busy ? '新增中…' : submitLabel}
        </button>
      </div>
    </>
  );
}
