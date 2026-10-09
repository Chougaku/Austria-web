import { useEffect, useMemo, useRef, useState } from 'react';
import { byCategory } from '../data';
import Chip from '../components/Chip';
import Heart from '../components/Heart';
import Reveal from '../components/Reveal';
import Stamp from '../components/Stamp';
import MapLink from '../components/MapLink';
import SearchField from '../components/SearchField';
import HitText from '../components/HitText';
import { useTripState } from '../state/store';
import { tokenize, scoreEntity, suggestFoodTypes, makeSegments } from '../lib/search';
import CityChips from '../components/CityChips';
import { inCity, type CityFilter } from '../lib/trip';
import AddPlace from '../components/AddPlace';
import { AddButton, AddedNotice } from '../components/AddFlow';
import { useAddFlow } from '../lib/useAddFlow';

export default function Food() {
  const { favs } = useTripState();
  const all = useMemo(() => byCategory('餐廳'), []);
  const [cat, setCat] = useState('全部');
  const [city, setCity] = useState<CityFilter>('all');
  const [q, setQ] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const add = useAddFlow();

  const tokens = useMemo(() => tokenize(q), [q]);
  const suggestions = useMemo(() => suggestFoodTypes(q), [q]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setSuggestOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const cats = useMemo(
    () => ['全部', ...Array.from(new Set(all.map((r) => r.fields['類型'] ?? '未分類')))],
    [all],
  );

  const hasAnyFav = all.some((r) => favs[`fav:${r.id}`]);

  const list = all
    .map((r) => ({ r, score: tokens.length ? scoreEntity(r, tokens) : 0 }))
    .filter(({ r, score }) =>
      (cat === '全部' || (r.fields['類型'] ?? '未分類') === cat) &&
      inCity(r, city) &&
      (!favOnly || favs[`fav:${r.id}`]) &&
      (tokens.length === 0 || score > 0))
    .sort((a, b) => (b.score - a.score) || ((b.r.rating ?? 0) - (a.r.rating ?? 0)))
    .map(({ r }) => r);

  const pickType = (type: string) => {
    setCat(type);
    setQ('');
    setSuggestOpen(false);
  };

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340, display: 'flex' }}>
          <SearchField
            value={q}
            onChange={(v) => { setQ(v); setSuggestOpen(true); }}
            placeholder="搜尋店名、類型、區域…"
            onKeyDown={(e) => { if (e.key === 'Escape') setSuggestOpen(false); }}
          />
          {suggestOpen && tokens.length > 0 && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
              background: 'var(--card)', border: '1px solid var(--line-dark)', borderRadius: 8,
              boxShadow: '0 6px 18px rgba(34,32,28,.14)', zIndex: 40, padding: '4px 0',
            }}>
              {suggestions.map(({ type, count }) => (
                <button key={type} className="btn-plain" onClick={() => pickType(type)} style={{
                  display: 'flex', width: '100%', alignItems: 'baseline', gap: 8,
                  padding: '9px 14px', cursor: 'pointer', fontSize: 13.5,
                }}>
                  <span style={{ fontWeight: 600 }}>
                    <HitText segments={makeSegments(type, tokens)} />
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--brown)' }}>{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Chip on={favOnly} red onClick={() => setFavOnly(!favOnly)}>♥ 只看已標記</Chip>
        <span style={{ fontSize: 12.5, color: 'var(--brown)' }}>共 {list.length} 間</span>
        {!add.open && <AddButton label="餐廳" onClick={add.start} />}
      </div>
      <AddedNotice names={add.added} />
      {add.open && <AddPlace category="餐廳" onCancel={add.cancel} onAdded={add.done} />}
      <CityChips items={all} value={city} onChange={setCity} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {cats.map((c) => {
          const n = c === '全部' ? all.length : all.filter((r) => (r.fields['類型'] ?? '未分類') === c).length;
          return <Chip key={c} on={cat === c} onClick={() => setCat(c)}>{c} {n}</Chip>;
        })}
      </div>
      {list.length === 0 && (
        <div className="card" style={{ padding: '18px 20px', fontSize: 13, color: 'var(--brown)' }}>
          {favOnly && !hasAnyFav ? '還沒有標記的店，去按 ♥' : '沒有符合的店家'}
        </div>
      )}
      <div className="cards-grid">
        {list.map((r, i) => {
          const note = r.fields['備註'] && r.fields['備註'] !== '-' ? r.fields['備註'] : r.summary;
          return (
            <Reveal key={r.id} index={i}>
            <div className="card" style={{ padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <Stamp rating={r.rating} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.35 }}>
                  <HitText segments={makeSegments(r.name, tokens)} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', border: '1px solid rgba(30,53,92,.4)', borderRadius: 4, padding: '1.5px 7px' }}>{r.fields['類型'] ?? '未分類'}</span>
                  <span style={{ fontSize: 12, color: 'var(--brown)' }}>{r.fields['價位'] && r.fields['價位'] !== '-' ? r.fields['價位'] : '價位未記'}</span>
                  {r.area && <span style={{ fontSize: 12, color: 'var(--brown)' }}>{r.area}</span>}
                  <MapLink name={r.name} area={r.area} />
                </div>
                {note && (
                  <div style={{ fontSize: 12.5, color: 'var(--brown-dk)', marginTop: 7, borderTop: '1px dashed rgba(34,32,28,.16)', paddingTop: 7 }}>
                    <HitText segments={makeSegments(note, tokens)} />
                  </div>
                )}
              </div>
              <Heart entityId={r.id} />
            </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
