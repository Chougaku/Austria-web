import { CATEGORIES, type Entity } from '../data/schema';
import Heart from './Heart';
import MapLink from './MapLink';

/** 想去清單：依分類分組列出已標記的地點。items 由呼叫端篩選。 */
export default function WishList({ items }: { items: Entity[] }) {
  if (items.length === 0) {
    return (
      <div className="card" style={{ fontSize: 13, color: 'var(--brown)' }}>
        還沒有標記，去美食庫、景點與購物頁按 ♡。
      </div>
    );
  }
  const groups = CATEGORIES
    .map((c) => [c, items.filter((e) => e.category === c)] as const)
    .filter(([, list]) => list.length > 0);
  return (
    <div className="card fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {groups.map(([cat, list]) => (
        <div key={cat}>
          <div className="serif" style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
            {cat} <span style={{ fontSize: 12, color: 'var(--brown)', fontWeight: 400 }}>{list.length}</span>
          </div>
          {list.map((e) => (
            <div key={e.id} className="dash-bottom" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px' }}>
              <Heart entityId={e.id} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{e.name}</span>
              {e.area && (
                <span style={{ fontSize: 11, color: 'var(--brown)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap' }}>
                  {e.area}
                </span>
              )}
              <span style={{ flex: 1 }} />
              <MapLink name={e.name} area={e.area} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
