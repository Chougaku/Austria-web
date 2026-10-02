import AreaRail from '../components/AreaRail';
import TripMap from '../components/TripMap';
import { AREAS, CITIES } from '../data/areas';

/** 周邊一日遊：不在住宿那個市鎮裡、要另外開車或搭車去的區域（機場除外）。 */
function dayTrips() {
  return CITIES.map((c) => {
    const base = AREAS.find((a) => a.name === (c.base ?? c.name));
    const trips = AREAS.filter((a) => a.city === c.key && !a.isCity && a !== base
      && a.town !== base?.town && !a.name.endsWith('機場'));
    return { city: c, trips };
  }).filter((g) => g.trips.length > 0);
}

export default function AreaMap() {
  return (
    <div className="fade-up" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
      <div className="card" style={{ flex: 2, minWidth: 300, padding: '24px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <span className="serif" style={{ fontSize: 18, fontWeight: 800 }}>奧地利・巴伐利亞 路線地圖</span>
          <span style={{ fontSize: 12, color: 'var(--brown)' }}>點郵戳看該區有什麼</span>
        </div>
        <TripMap highlightAreas={null} height={420} showRoute />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '20px 0 14px' }}>
          <span className="serif" style={{ fontSize: 18, fontWeight: 800 }}>路線・城市與區域</span>
          <span style={{ fontSize: 12, color: 'var(--brown)' }}>依行程順序 ↓</span>
        </div>
        <AreaRail highlightAreas={null} showCounts={true} />
      </div>
      <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="serif" style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>周邊一日遊</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
            {dayTrips().map(({ city, trips }) => (
              <div key={city.key}>
                <div style={{ fontSize: 11.5, color: 'var(--brown)', letterSpacing: '.08em', marginBottom: 4 }}>
                  從 {city.name} 出發
                </div>
                {trips.map((a) => (
                  <div key={a.name} style={{ display: 'flex', gap: 8, padding: '2px 0' }}>
                    <span style={{ color: 'var(--navy)', fontWeight: 700 }}>◆</span>
                    <span><b>{a.name}</b>：{a.pts}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: 'rgba(30,53,92,.06)', border: '1px dashed rgba(30,53,92,.4)', borderRadius: 10, padding: '16px 20px', fontSize: 12.5, color: '#34466A', lineHeight: 1.7 }}>
          地圖標記做到「區域」粒度（各區代表地標）。各店座標 vault 裡還沒有，
          之後把 Google Maps 清單匯進 vault，就能把郵戳下放到店家層級。
          要新增城市或區域，改 Austria-web 的 <code>src/data/areas.ts</code>。
        </div>
      </div>
    </div>
  );
}
