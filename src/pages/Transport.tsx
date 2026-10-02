import type { CSSProperties } from 'react';
import { byCategory, overview } from '../data';
import type { Entity } from '../data/schema';
import MarkdownBody from '../components/MarkdownBody';
import { stripEntityCardBody } from '../lib/entity-body';
import { LEG_META, shortDate } from '../lib/trip';

type Group = 'drive' | 'train' | 'local';

/** 交通實體分三區：自駕（維也納 → 因斯布魯克）、火車（因斯布魯克 → 慕尼黑）、市內交通。
    依「類型」欄、tags 與名稱判斷，判不出來的都算市內。 */
const GROUPS: { key: Group; title: string; en: string; color: string; hint: string; test: RegExp }[] = [
  { key: 'drive', title: '自駕', en: 'MIETWAGEN', color: 'var(--red)', hint: '租車、取還車、Vignette、停車', test: /自駕|租車|停車|加油|vignette|高速公路/i },
  { key: 'train', title: '火車', en: 'BAHN', color: 'var(--navy)', hint: '城際火車、車票與車次', test: /火車|鐵路|列車|öbb|railjet|(^|[^a-z])(db|ice)([^a-z]|$)/i },
  { key: 'local', title: '市內交通', en: 'STADTVERKEHR', color: 'var(--green)', hint: '地鐵、電車、城市卡', test: /[\s\S]/ },
];

function transportGroup(e: Pick<Entity, 'name' | 'tags' | 'fields'>): Group {
  const hay = `${e.fields['類型'] ?? ''} ${e.tags.join(' ')} ${e.name}`;
  return GROUPS.find((g) => g.test.test(hay))?.key ?? 'local';
}

export default function Transport() {
  const items = byCategory('交通');
  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 820 }}>
      {/* 路段時間軸 */}
      <div className="card" style={{ padding: '18px 22px' }}>
        <div className="ov-card-head">
          <span className="label-en" style={{ fontSize: 10.5, letterSpacing: '.2em' }}>ROUTE</span>
          <span className="ov-card-title">城市間移動</span>
        </div>
        <div className="leg-list">
          {overview.legs.map((l) => (
            <div key={`${l.date}${l.from}`} className={`leg-row leg-row--${l.mode}`}>
              <span className="leg-date">{shortDate(l.date)}</span>
              <span className="leg-mode" aria-hidden="true">{LEG_META[l.mode].glyph}</span>
              <span className="leg-route">{l.from} → {l.to}<small>{LEG_META[l.mode].label}</small></span>
              {l.note && <span className="leg-note">{l.note}</span>}
            </div>
          ))}
        </div>
        {overview.transportNotes.length > 0 && (
          <div className="dash-top" style={{ marginTop: 10, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
            {overview.transportNotes.map((n) => {
              const [mark, ...rest] = n.split('｜');
              return (
                <div key={n} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ flex: 'none' }}>{rest.length ? mark : '・'}</span>
                  <span style={{ color: 'var(--brown-dk)' }}>{rest.length ? rest.join('｜') : mark}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {GROUPS.map((g) => {
        const list = items.filter((e) => transportGroup(e) === g.key);
        return (
          <section key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="trans-section-title" style={{ '--section': g.color } as CSSProperties}>{g.title}</span>
              <span className="label-en" style={{ fontSize: 10.5 }}>{g.en}</span>
              <span style={{ fontSize: 12, color: 'var(--brown)' }}>{list.length} 項</span>
            </div>
            {list.length === 0 && (
              <div className="trans-empty">還沒有資料——在 vault 的 wiki/entities/交通/ 新增（{g.hint}）。</div>
            )}
            {list.map((t) => (
              <div key={t.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ background: g.color, color: '#F4F0E7', padding: '14px 22px', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 10 }}>
                  <span className="serif" style={{ fontSize: 18, fontWeight: 800 }}>{t.name}</span>
                  <span style={{ fontSize: 12, opacity: .82 }}>{t.summary.slice(0, 60)}</span>
                </div>
                {Object.keys(t.fields).length > 0 && (
                  <div style={{ padding: '12px 22px 0', display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: '4px 14px', fontSize: 13 }}>
                    {Object.entries(t.fields).map(([k, v]) => (
                      <div key={k} style={{ display: 'contents' }}>
                        <span style={{ color: 'var(--brown)', fontWeight: 600, whiteSpace: 'nowrap' }}>{k}</span>
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding: '6px 22px 18px' }}>
                  <MarkdownBody>{stripEntityCardBody(t.body)}</MarkdownBody>
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
