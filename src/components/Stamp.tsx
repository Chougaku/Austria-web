import { useEffect, useRef, useState } from 'react';

export default function Stamp({ rating }: { rating: number | null }) {
  const [pop, setPop] = useState(false);
  const prevRatingRef = useRef<number | null>(rating);

  useEffect(() => {
    if (prevRatingRef.current == null && rating != null) {
      setPop(true);
    }
    prevRatingRef.current = rating;
  }, [rating]);

  const triggerPop = () => {
    if (rating == null) return;
    setPop(false);
    requestAnimationFrame(() => setPop(true));
  };

  return (
    <div
      className={`stamp${rating == null ? ' stamp--off' : ''}${pop ? ' stamp--pop' : ''}`}
      onClick={triggerPop}
      onAnimationEnd={() => setPop(false)}
      title={rating == null ? '未蓋章' : '點擊試蓋墨暈'}
      style={{ cursor: rating != null ? 'pointer' : 'default' }}
    >
      {rating == null ? '—' : rating.toFixed(1)}
    </div>
  );
}