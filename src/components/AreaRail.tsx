import type { CSSProperties, ReactNode } from 'react';
import { entities } from '../data';
import { CITIES, MAP_AREAS, type AreaInfo, type CityKey } from '../data/areas';
import { useTripState } from '../state/store';
import { useReveal } from '../lib/useReveal';
import { LEG_META, routeSegments, shortDate, stayOfCity } from '../lib/trip';

/** 路線區域列：6 座城市照行程順序往下排，站與站之間依移動方式畫線
    （自駕實線、火車虛線），每站底下是城內分區。 */
export default function AreaRail({ highlightAreas, showCounts, renderExtra, cities }: {
  highlightAreas: string[] | null;
  showCounts: boolean;
  /** 讓呼叫端往區域卡片裡塞東西（每日行程用來掛當天的時段）。 */
  renderExtra?: (area: AreaInfo) => ReactNode;
  /** 只列這幾座城市（每日行程的地圖檢視只看當天經過的城市）；不給＝全部。 */
  cities?: CityKey[];
}) {
  const { favs } = useTripState();
  const revealRef = useReveal();
  const favIn = (names: string[]) =>
    entities.filter((e) => names.includes(e.area) && favs[`fav:${e.id}`]).length;
  const hl = (a: AreaInfo) => !!highlightAreas && highlightAreas.includes(a.name);
  const segs = routeSegments();
  const shown = CITIES.filter((c) => !cities || cities.includes(c.key));

  const box = (a: AreaInfo, extra?: ReactNode) => {
    const fav = showCounts ? favIn([a.name]) : 0;
    return (
      <div key={a.name} className={`area-box${hl(a) ? ' area-box--on' : ''}`}>
        <div className="area-box-head">
          <span className="area-box-name">{a.name}</span>
          <span className="area-box-en">{a.en}</span>
          {a.badge && <span style={{ fontSize: 12 }}>{a.badge}</span>}
          {fav > 0 && <span className="area-fav">♥ {fav}</span>}
          {extra}
        </div>
        <div className="area-box-pts">{a.pts}</div>
        {renderExtra?.(a)}
      </div>
    );
  };

  return (
    <div ref={revealRef} className="area-rail">
      {shown.map((c, idx) => {
        const areas = MAP_AREAS.filter((a) => a.city === c.key);
        const main = areas.find((a) => a.isCity);
        const subs = areas.filter((a) => !a.isCity);
        const stay = stayOfCity(c.key);
        const i = CITIES.indexOf(c);
        const inSeg = i > 0 ? segs[i - 1] : undefined;
        const outSeg = segs[i];
        const on = areas.some(hl);
        const last = idx === shown.length - 1;
        const delay = { '--rail-delay': `${Math.min(idx * 60, 300)}ms` } as CSSProperties;
        const stayTag = stay && (
          <span style={{ fontSize: 11.5, color: 'var(--brown-dk)' }}>
            {shortDate(stay.checkIn)}–{shortDate(stay.checkOut)}・{stay.nights} 晚
          </span>
        );
        return (
          <div key={c.key}>
            <div className="area-rail-row" style={delay}>
              <div className="area-rail-track">
                {/* 上段固定高度，讓站點對齊城市卡的標題列，而不是整列（含分區）的正中間 */}
                <div className={`area-rail-line area-rail-line--top area-rail-line--${idx === 0 || !inSeg ? 'none' : inSeg.leg?.mode ?? 'other'}`} />
                <div className={`area-rail-dot${on ? ' area-rail-dot--on' : ''}`} />
                <div className={`area-rail-line area-rail-line--${last || !outSeg ? 'none' : outSeg.leg?.mode ?? 'other'}`} />
              </div>
              <div className="area-rail-body">
                {main && box(main, stayTag)}
                {subs.length > 0 && <div className="area-subs">{subs.map((a) => box(a))}</div>}
              </div>
            </div>
            {/* 往下一站的那段路：只在下一站也有列出來時才畫 */}
            {!last && outSeg && cities === undefined && (
              <div className={`area-leg area-leg--${outSeg.leg?.mode ?? 'other'}`} style={delay}>
                <div className="area-rail-track">
                  <div className={`area-rail-line area-rail-line--${outSeg.leg?.mode ?? 'other'}`} />
                </div>
                <div className="area-leg-text">
                  {outSeg.leg ? (
                    <>
                      <b>{LEG_META[outSeg.leg.mode].glyph} {LEG_META[outSeg.leg.mode].label}</b>
                      {'　'}{shortDate(outSeg.leg.date)}・{outSeg.from.name} → {outSeg.to.name}
                    </>
                  ) : (
                    <>{outSeg.from.name} → {outSeg.to.name}（移動方式未填）</>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
