import { useMemo, useState, type ReactNode } from 'react';
import { byCategory } from '../data';
import type { Entity } from '../data/schema';
import Reveal from '../components/Reveal';
import Stamp from '../components/Stamp';
import MapLink from '../components/MapLink';
import SearchField from '../components/SearchField';
import HitText from '../components/HitText';
import { tokenize, scoreEntity, makeSegments } from '../lib/search';
import CityChips from '../components/CityChips';
import { inCity, type CityFilter } from '../lib/trip';
import AddPlace from '../components/AddPlace';
import Cover from '../components/Cover';
import EntityActions from '../components/EntityActions';
import EntityDetail from '../components/EntityDetail';
import { onCardClick } from '../lib/card-click';
import { deletedKey, useDeleted } from '../lib/deleted';
import { entityImages } from '../lib/images';
import { AddButton, AddedNotice } from '../components/AddFlow';
import type { AddableCategory } from '../api/add';
import { useAddFlow } from '../lib/useAddFlow';

export default function Places() {
  const deleted = useDeleted();
  // 剛從網站刪掉的先藏起來（網站重建後 vault 裡就沒有了）
  const alive = (e: Entity) => !deleted.has(deletedKey.entity(e.id));
  const spots = byCategory('景點').filter(alive);
  const shops = byCategory('購物').filter(alive);
  const [q, setQ] = useState('');
  const [city, setCity] = useState<CityFilter>('all');
  // 點卡片打開的詳細頁（start＝從封面第幾張點進來）
  const [detail, setDetail] = useState<{ entity: Entity; start: number } | null>(null);
  const tokens = useMemo(() => tokenize(q), [q]);

  const filterList = (all: Entity[]) => {
    const list = all.filter((p) => inCity(p, city));
    if (tokens.length === 0) return list;
    return list
      .map((p) => ({ p, score: scoreEntity(p, tokens) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => (b.score - a.score) || ((b.p.rating ?? 0) - (a.p.rating ?? 0)))
      .map(({ p }) => p);
  };

  const fSpots = filterList(spots);
  const fShops = filterList(shops);
  const allEmpty = (tokens.length > 0 || city !== 'all') && fSpots.length === 0 && fShops.length === 0;

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <SearchField value={q} onChange={setQ} placeholder="搜尋景點、購物…" />
      </div>
      <CityChips items={[...spots, ...shops]} value={city} onChange={setCity} />
      {allEmpty && (
        <div className="card" style={{ padding: '18px 20px', fontSize: 13, color: 'var(--brown)' }}>
          沒有符合的項目
        </div>
      )}
      {!allEmpty && (
        <>
          <section>
            <SectionHead category="景點" accent="var(--red)">{fSpots.length} 處</SectionHead>
            {fSpots.length === 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--brown)' }}>沒有符合的景點</div>
            )}
            <div className="cards-grid">
              {fSpots.map((p, i) => {
                return (
                  <Reveal key={p.id} index={i}>
                  <div className="card card--tap" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}
                    onClick={onCardClick(() => setDetail({ entity: p, start: 0 }))}>
                    <Cover urls={entityImages(p).map((i) => i.url)} alt={p.name} onOpen={(i) => setDetail({ entity: p, start: i })} />
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', width: '100%' }}>
                      <Stamp rating={p.rating} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="serif" style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.35 }}>
                          <button type="button" className="btn-plain card-title-btn" onClick={() => setDetail({ entity: p, start: 0 })}>
<HitText segments={makeSegments(p.name, tokens)} />
</button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7, alignItems: 'center' }}>
                          {p.fields['類型'] && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', border: '1px solid rgba(30,53,92,.4)', borderRadius: 4, padding: '1.5px 7px' }}>{p.fields['類型']}</span>}
                          <span style={{ fontSize: 12, color: 'var(--brown)' }}>
                            {[p.fields['位置'], p.fields['門票']].filter(Boolean).join('・')}
                          </span>
                          <MapLink name={p.name} area={p.area} />
                        </div>
                        {p.summary && (
                          <div style={{ fontSize: 12.5, color: 'var(--brown-dk)', marginTop: 7, borderTop: '1px dashed rgba(34,32,28,.16)', paddingTop: 7 }}>
                            <HitText segments={makeSegments(p.summary, tokens)} />
                          </div>
                        )}
                      </div>
                      <EntityActions entity={p} />
                    </div>
                  </div>
                  </Reveal>
                );
              })}
            </div>
          </section>
          <section>
            <SectionHead category="購物" accent="var(--navy)">{fShops.length} 處</SectionHead>
            {fShops.length === 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--brown)' }}>沒有符合的購物點</div>
            )}
            <div className="cards-grid">
              {fShops.map((p, i) => (
                <Reveal key={p.id} index={i}>
                <div className="card card--tap" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}
                  onClick={onCardClick(() => setDetail({ entity: p, start: 0 }))}>
                  <Cover urls={entityImages(p).map((i) => i.url)} alt={p.name} onOpen={(i) => setDetail({ entity: p, start: i })} />
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span className="serif" style={{ fontSize: 15.5, fontWeight: 700 }}>
                        <button type="button" className="btn-plain card-title-btn" onClick={() => setDetail({ entity: p, start: 0 })}>
<HitText segments={makeSegments(p.name, tokens)} />
</button>
                      </span>
                      {p.rating != null && <span style={{ fontSize: 11.5, color: 'var(--red)', fontWeight: 700 }}>★ {p.rating.toFixed(1)}</span>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7, alignItems: 'center' }}>
                      {p.area && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', border: '1px solid rgba(30,53,92,.4)', borderRadius: 4, padding: '1.5px 7px' }}>{p.area}</span>}
                      <span style={{ fontSize: 12, color: 'var(--brown)' }}>{p.fields['類型'] ?? ''}</span>
                      <MapLink name={p.name} area={p.area} />
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--brown-dk)', marginTop: 7 }}>
                      <HitText segments={makeSegments(p.summary, tokens)} />
                    </div>
                  </div>
                  <EntityActions entity={p} />
                  </div>
                </div>
                </Reveal>
              ))}
            </div>
          </section>
        </>
      )}
      {detail && <EntityDetail entity={detail.entity} start={detail.start} onClose={() => setDetail(null)} />}
    </div>
  );
}

/** 分區標題＋「新增」：登入後打開表單，沒登入先跳登入框。送出後網站要等重建才看得到，先在標題下說一聲。 */
function SectionHead({ category, accent, children }: { category: AddableCategory; accent: string; children: ReactNode }) {
  const flow = useAddFlow();
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <span className="serif" style={{ fontSize: 20, fontWeight: 800, borderLeft: `4px solid ${accent}`, paddingLeft: 12 }}>{category}</span>
        <span style={{ fontSize: 12, color: 'var(--brown)' }}>{children}</span>
        {!flow.open && <AddButton label={category} onClick={flow.start} />}
      </div>
      <AddedNotice names={flow.added} />
      {flow.open && <AddPlace category={category} onCancel={flow.cancel} onAdded={flow.done} />}
    </>
  );
}
