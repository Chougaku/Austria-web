import type { Entity } from '../data/schema';
import { CITIES } from '../data/areas';
import { entityCity, type CityFilter } from '../lib/trip';
import Chip from './Chip';

/** 城市篩選列：只列出這批資料裡真的有東西的城市，照行程順序。 */
export default function CityChips({ items, value, onChange }: {
  items: Pick<Entity, 'area'>[];
  value: CityFilter;
  onChange: (c: CityFilter) => void;
}) {
  const counts = CITIES
    .map((c) => ({ c, n: items.filter((e) => entityCity(e)?.key === c.key).length }))
    .filter((x) => x.n > 0);
  if (counts.length < 2 && value === 'all') return null;
  return (
    <div className="hscroll" role="group" aria-label="依城市篩選">
      <Chip on={value === 'all'} onClick={() => onChange('all')}>全部城市 {items.length}</Chip>
      {counts.map(({ c, n }) => (
        <Chip key={c.key} on={value === c.key} onClick={() => onChange(c.key)}>{c.name} {n}</Chip>
      ))}
    </div>
  );
}
