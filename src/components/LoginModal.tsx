import { useState, type FormEvent } from 'react';
import { useAuth } from '../state/auth';

export default function LoginModal() {
  const { loginOpen, closeLogin, login } = useAuth();
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!loginOpen) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const ok = await login(pw); // 成功會 reload；失敗回 false
      if (!ok) { setError(true); setBusy(false); }
    } catch {
      setError(true); setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" onClick={closeLogin}
      style={{
        position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(34,32,28,.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '18vh 16px 16px',
      }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="card"
        style={{ width: 'min(360px, 92vw)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="serif" style={{ fontSize: 19, fontWeight: 700 }}>登入以編輯</div>
        <div style={{ fontSize: 13, color: 'var(--brown-dk)' }}>輸入密碼即可標記想去的地方；未登入僅能瀏覽。</div>
        <label htmlFor="login-pw" style={{ fontSize: 12, color: 'var(--brown)', letterSpacing: '.08em' }}>密碼</label>
        <input id="login-pw" type="password" inputMode="numeric" pattern="[0-9]*"
          autoComplete="one-time-code" enterKeyHint="go" autoFocus
          value={pw} onChange={(e) => { setPw(e.target.value); setError(false); }}
          style={{
            fontSize: 20, letterSpacing: '.3em', textAlign: 'center',
            padding: '12px 14px', borderRadius: 8, border: '1px solid var(--line-dark)',
            background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'inherit',
          }} />
        {error && <div style={{ fontSize: 12.5, color: 'var(--red)' }}>密碼錯誤</div>}
        <button type="submit" disabled={busy}
          style={{
            minHeight: 44, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'var(--red)', color: '#F8F5EE', fontSize: 15, fontWeight: 700,
            fontFamily: 'inherit', opacity: busy ? 0.7 : 1,
          }}>{busy ? '登入中…' : '登入'}</button>
        <button type="button" className="btn-plain" onClick={closeLogin}
          style={{ fontSize: 12.5, color: 'var(--brown)', textAlign: 'center' }}>取消</button>
      </form>
    </div>
  );
}
