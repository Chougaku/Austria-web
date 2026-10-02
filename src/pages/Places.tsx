import { useMemo, useState } from 'react';
import { byCategory } from '../data';
import type { Entity } from '../data/schema';
import Heart from '../components/Heart';
import Reveal from '../components/Reveal';
import Stamp from '../components/Stamp';
import MapLink from '../components/MapLink';
import SearchField from '../components/SearchField';
import HitText from '../components/HitText';
import { tokenize, scoreEntity, makeSegments } from '../lib/search';
import CityChips from '../components/CityChips';
import { inCity, type CityFilter } from '../lib/trip';

export default function Places() {
  const spots = byCategory('景點');
  const shops = byCategory('購物');
  const [q, setQ] = useState('');
  const [city, setCity] = useState<CityFilter>('all');
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
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <span className="serif" style={{ fontSize: 20, fontWeight: 800, borderLeft: '4px solid var(--red)', paddingLeft: 12 }}>景點</span>
              <span style={{ fontSize: 12, color: 'var(--brown)' }}>{fSpots.length} 處</span>
            </div>
            {fSpots.length === 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--brown)' }}>沒有符合的景點</div>
            )}
            <div className="cards-grid">
              {fSpots.map((p, i) => {
                const matchImg = p.body?.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
                const coverUrl = matchImg ? matchImg[1] : null;
                return (
                  <Reveal key={p.id} index={i}>
                  <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {coverUrl && (
                      <div style={{ width: '100%', height: 130, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                        <img src={coverUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', width: '100%' }}>
                      <Stamp rating={p.rating} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="serif" style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.35 }}>
                          <HitText segments={makeSegments(p.name, tokens)} />
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', border: '1px solid rgba(30,53,92,.4)', borderRadius: 4, padding: '1.5px 7px' }}>{p.fields['類型'] ?? ''}</span>
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
                      <Heart entityId={p.id} />
                    </div>
                  </div>
                  </Reveal>
                );
              })}
            </div>
          </section>
          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <span className="serif" style={{ fontSize: 20, fontWeight: 800, borderLeft: '4px solid var(--navy)', paddingLeft: 12 }}>購物</span>
              <span style={{ fontSize: 12, color: 'var(--brown)' }}>{fShops.length} 處</span>
            </div>
            {fShops.length === 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--brown)' }}>沒有符合的購物點</div>
            )}
            <div className="cards-grid">
              {fShops.map((p, i) => (
                <Reveal key={p.id} index={i}>
                <div className="card" style={{ padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span className="serif" style={{ fontSize: 15.5, fontWeight: 700 }}>
                        <HitText segments={makeSegments(p.name, tokens)} />
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
                  <Heart entityId={p.id} />
                </div>
                </Reveal>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
