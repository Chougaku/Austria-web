import { useEffect, useRef } from 'react';
import type * as LT from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_AREAS, cityInfo, type AreaInfo } from '../data/areas';
import { routeSegments } from '../lib/trip';

/**
 * 真地圖（OpenStreetMap 圖磚 + Leaflet）。標記是**區域**粒度不是店家粒度——
 * vault 沒有店家座標，硬編假座標比不標更糊，所以點下去用列表交代該區有什麼。
 *
 * 六座城市散在 400 公里寬的範圍，縮到看得到全程時一座城的幾個區只差一兩個像素，
 * 所以每次縮放都把螢幕上靠太近的郵戳併成一顆（同一城就顯示城名），點開仍看得到是哪幾區。
 *
 * leaflet 走動態 import：它有 40KB 且在載入時就摸 window，靜態 import 會把整包塞進
 * 首頁的 bundle，也會讓 node 環境的測試（App.test.tsx）直接爆掉。
 */
export default function TripMap({ highlightAreas, popupFor, height = 340, showRoute = false }: {
  /** 要強調的區域（每日行程傳當天的）。null＝全部同等呈現。 */
  highlightAreas: string[] | null;
  /** 該區要顯示在氣泡裡的內容（純文字行），沒有就只顯示區域代表點。 */
  popupFor?: (area: AreaInfo) => string[];
  height?: number;
  /** 畫出城市間的路線（自駕實線、火車虛線）。 */
  showRoute?: boolean;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  // 放進 ref：呼叫端多半是行內箭頭函式，每次 render 都換身分，直接當相依會不斷重建地圖。
  const popupRef = useRef(popupFor);
  popupRef.current = popupFor;
  const key = highlightAreas ? highlightAreas.join('|') : '';

  useEffect(() => {
    let map: LT.Map | null = null;
    let cancelled = false;

    void (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !elRef.current) return;
      map = L.map(elRef.current, { scrollWheelZoom: false });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const shown = key
        ? MAP_AREAS.filter((a) => key.split('|').includes(a.name))
        : MAP_AREAS;
      const on = !!key;
      const linesOf = (a: AreaInfo) => popupRef.current?.(a) ?? [];
      const popup = (title: string, pts: string, lines: string[]) =>
        `<b>${title}</b><div class="map-pop-pts">${pts}</div>`
        + (lines.length ? `<ul class="map-pop-list">${lines.map((t) => `<li>${t}</li>`).join('')}</ul>` : '');

      if (showRoute) {
        for (const seg of routeSegments()) {
          L.polyline([[seg.from.lat, seg.from.lng], [seg.to.lat, seg.to.lng]], {
            className: `route-line route-line--${seg.leg?.mode ?? 'other'}`,
            interactive: false,
          }).addTo(map);
        }
      }

      const layer = L.layerGroup().addTo(map);
      const draw = () => {
        if (!map) return;
        layer.clearLayers();
        for (const group of cluster(map, shown)) {
          const one = group.length === 1;
          const city = cityInfo(group[0].city);
          const sameCity = group.every((a) => a.city === group[0].city);
          const label = one ? group[0].name : sameCity ? city.name : `${group[0].name}+${group.length - 1}`;
          const lines = group.flatMap((a) => linesOf(a).map((t) => (one ? t : `${a.name}｜${t}`)));
          const anchor = group.find((a) => a.isCity) ?? group[0];
          L.marker([anchor.lat, anchor.lng], {
            icon: stampIcon(L, label, on, lines.length, !one && sameCity),
          })
            .bindPopup(popup(label, one ? group[0].pts : group.map((a) => a.name).join('・'), lines))
            .addTo(layer);
        }
      };

      map.fitBounds(L.latLngBounds(shown.map((a) => [a.lat, a.lng])), {
        padding: [46, 46], maxZoom: 14, animate: false,
      });
      draw();
      map.on('zoomend', draw);
    })();

    return () => { cancelled = true; map?.remove(); map = null; };
  }, [key, showRoute]);

  return (
    <div>
      <div ref={elRef} className="trip-map" style={{ height }} />
      {showRoute && (
        <div className="map-legend">
          <span><i />自駕</span>
          <span><i className="train" />火車</span>
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--brown-lt)', marginTop: 6 }}>
        標記是區域概略位置（多半取該區代表地標），不是各店座標；靠太近的會併成一枚。
      </div>
    </div>
  );
}

/** 螢幕距離小於這個像素的郵戳併成一顆，否則會疊在一起點不到。 */
const MERGE_PX = 44;

/** 依目前縮放把區域分群：照 AREAS 順序貪婪歸群，每城的「市中心」排在最前，
    所以一城併起來時郵戳會落在市中心。 */
function cluster(map: LT.Map, areas: AreaInfo[]): AreaInfo[][] {
  const groups: { at: LT.Point; areas: AreaInfo[] }[] = [];
  for (const a of areas) {
    const p = map.latLngToLayerPoint([a.lat, a.lng]);
    const hit = groups.find((g) => g.at.distanceTo(p) < MERGE_PX);
    if (hit) hit.areas.push(a);
    else groups.push({ at: p, areas: [a] });
  }
  return groups.map((g) => g.areas);
}

/** 一枚雙圈郵戳當標記——沿用 .stamp 的護照語彙，不用 Leaflet 預設的藍水滴針
    （預設圖示還會被打包器打壞路徑，divIcon 順便閃掉這個坑）。名字長就拉成橢圓戳。 */
function stampIcon(L: typeof LT, name: string, on: boolean, count: number, city: boolean) {
  const h = on ? 40 : 32;
  const w = Math.max(h, Math.round(name.length * (on ? 13 : 11.5) + 16));
  const cls = ['map-stamp', on ? 'map-stamp--on' : '', city && !on ? 'map-stamp--city' : '']
    .filter(Boolean).join(' ');
  return L.divIcon({
    className: '',
    html: `<span class="${cls}" style="width:${w}px;height:${h}px">`
      + `${name}${count > 0 ? `<i class="map-stamp-n">${count}</i>` : ''}</span>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h / 2],
  });
}
