import type { Segment } from '../lib/search';

export default function HitText({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, i) =>
        s.hit ? <mark key={i} className="search-hit">{s.text}</mark> : <span key={i}>{s.text}</span>,
      )}
    </>
  );
}
