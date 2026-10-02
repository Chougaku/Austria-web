import { googleMapsUrl } from '../lib/maps';

/** 卡片上的「在 Google 地圖開啟」小連結（以店名搜尋）。 */
export default function MapLink({ name, area }: { name: string; area?: string }) {
  return (
    <a
      href={googleMapsUrl(name, area)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`在 Google 地圖搜尋 ${name}`}
      style={{
        fontSize: 12, color: 'var(--navy)', textDecoration: 'none',
        display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
        border: '1px solid rgba(30,53,92,.35)', borderRadius: 4, padding: '1.5px 7px',
      }}
    >
      📍 地圖
    </a>
  );
}
