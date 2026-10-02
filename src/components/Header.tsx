import { byCategory, meta, overview } from '../data';
import { CITIES } from '../data/areas';
import Chip from './Chip';
import { useTripState } from '../state/store';
import { apiBase, getToken, setupLink } from '../api/state';
import { useAuth } from '../state/auth';
import { countdownDays } from '../lib/countdown';
import { TABS, type TabKey } from '../lib/tabs';
import SyncSeal from './SyncSeal';

export default function Header({ tab, onNavigate }: { tab: TabKey; onNavigate: (k: TabKey) => void }) {
  const { offline } = useTripState();
  const { canEdit, openLogin, logout } = useAuth();
  const cd = countdownDays(meta.tripStart);
  const foodCount = byCategory('餐廳').length;
  const f = overview.fields;

  const go = (k: TabKey) => {
    onNavigate(k);
    window.scrollTo(0, 0);
  };

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50, background: 'rgba(243,239,230,.94)',
      backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)',
    }}>
      <div className="hdr-row hdr-top">
        <div className="hdr-logo" aria-hidden="true">奧</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <div className="serif hdr-title">
            奧地利旅券 <span className="label-en" style={{ fontSize: 12 }}>ÖSTERREICH · BAYERN</span>
          </div>
          <div className="hdr-sub">
            {f['出發顯示']} → {f['回程顯示']}・{f['天數']}・{CITIES.length} 城
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <SyncSeal />
        <div className="hdr-cd">
          <span className="hdr-cd-label" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.1em' }}>出發倒數</span>
          <span className="serif hdr-cd-num">{cd}</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>日</span>
        </div>
        {apiBase() && (canEdit ? (
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn-plain" title="複製新裝置設定連結" style={{ fontSize: 18, cursor: 'pointer' }}
              onClick={() => { const cur = getToken(); if (cur) window.prompt('新裝置設定連結（點一次即完成同步）：', setupLink(cur)); }}>⚙</button>
            <button className="btn-plain" style={{
              fontSize: 12.5, color: 'var(--brown-dk)', border: '1px solid var(--line-dark)',
              borderRadius: 6, padding: '6px 12px', minHeight: 34, cursor: 'pointer',
            }} onClick={logout}>登出</button>
          </div>
        ) : (
          <button className="btn-plain" style={{
            flex: 'none', fontSize: 13, color: 'var(--red)', border: '1px solid var(--red)',
            borderRadius: 6, padding: '6px 14px', minHeight: 34, fontWeight: 600, cursor: 'pointer',
          }} onClick={openLogin}>登入編輯</button>
        ))}
      </div>
      <div className="hdr-row hdr-nav">
        <nav className="hscroll" style={{ flex: 1, alignItems: 'center' }}>
          {TABS.map(([k, label]) => (
            <Chip key={k} on={tab === k} red onClick={() => go(k)}>
              {k === 'food' ? `${label} ${foodCount}` : label}
            </Chip>
          ))}
        </nav>
        {offline && (
          <span style={{ flex: 'none', fontSize: 11, color: 'var(--brown)', border: '1px dashed var(--brown)', borderRadius: 4, padding: '2px 8px' }}>
            離線・暫存本機
          </span>
        )}
      </div>
    </header>
  );
}
