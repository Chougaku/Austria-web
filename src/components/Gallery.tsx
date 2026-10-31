import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** 照片列：一次一張，手機左右滑（scroll-snap），電腦按左右箭頭；下方標「2 / 5」。
    onPick：點照片要做什麼（詳細頁裡＝開全螢幕）；keyboard：方向鍵換張（全螢幕用）。 */
export default function Gallery({ urls, alt, start = 0, full = false, keyboard = false, onPick }: {
  urls: string[];
  alt: string;
  start?: number;
  full?: boolean;
  keyboard?: boolean;
  onPick?: (index: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const last = urls.length - 1;
  const first = useRef(Math.max(0, Math.min(start, last)));
  const [index, setIndex] = useState(first.current);

  // 打開時直接停在點的那一張（只定位一次，之後交給使用者滑）
  useLayoutEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = first.current * el.clientWidth;
  }, []);

  const go = (to: number) => {
    const k = Math.max(0, Math.min(last, to));
    setIndex(k);
    const el = track.current;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    el?.scrollTo?.({ left: k * el.clientWidth, behavior: still ? 'auto' : 'smooth' });
  };

  const goRef = useRef(go);
  goRef.current = go;
  const indexRef = useRef(index);
  indexRef.current = index;
  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goRef.current(indexRef.current - 1);
      else if (e.key === 'ArrowRight') goRef.current(indexRef.current + 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [keyboard]);

  return (
    <div className={`gallery${full ? ' gallery--full' : ''}`}>
      <div ref={track} className="gallery-track"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}>
        {urls.map((u, k) => {
          const img = <img src={u} alt={urls.length > 1 ? `${alt}（第 ${k + 1} 張）` : alt} loading={k === index ? 'eager' : 'lazy'} />;
          return onPick
            ? <button key={`${u}-${k}`} type="button" className="btn-plain gallery-slide" aria-label={`放大看第 ${k + 1} 張`} onClick={() => onPick(k)}>{img}</button>
            : <div key={`${u}-${k}`} className="gallery-slide">{img}</div>;
        })}
      </div>
      {urls.length > 1 && (
        <>
          <button type="button" className="gallery-nav gallery-nav--prev" aria-label="上一張" disabled={index === 0} onClick={() => go(index - 1)}>‹</button>
          <button type="button" className="gallery-nav gallery-nav--next" aria-label="下一張" disabled={index === last} onClick={() => go(index + 1)}>›</button>
          <span className="gallery-count" aria-live="polite">{index + 1} / {urls.length}</span>
        </>
      )}
    </div>
  );
}
