import { guides } from '../data';
import { useTripState } from '../state/store';

export default function GuideFavCard() {
  const { guideFavs } = useTripState();
  const favGuides = guides.filter((g) => guideFavs[`guide:${g.id}`]);
  if (favGuides.length === 0) return null;
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ color: 'var(--red)', fontSize: 16 }}>★</span>
        <div className="serif" style={{ fontSize: 18, fontWeight: 700 }}>典藏攻略</div>
        <div style={{ fontSize: 12, color: 'var(--brown)' }}>{favGuides.length} 篇</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
        {favGuides.map((g) => (
          <button key={g.id} className="btn-plain dash-bottom"
            style={{ textAlign: 'left', padding: '9px 4px', fontSize: 13.5, cursor: 'pointer' }}
            onClick={() => { location.hash = 'guides'; }}>
            {g.title}
          </button>
        ))}
      </div>
    </div>
  );
}
