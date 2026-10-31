import { useRef, type KeyboardEvent, type MouseEvent } from 'react';

/** 卡片封面照片：一張就滿版；多張可以左右滑，角落標張數。
    onOpen：點封面打開詳細頁，帶著現在滑到第幾張。 */
export default function Cover({ urls, alt, onOpen }: { urls: string[]; alt: string; onOpen?: (index: number) => void }) {
  const strip = useRef<HTMLDivElement>(null);
  if (urls.length === 0) return null;
  const current = () => {
    const el = strip.current;
    return el && el.clientWidth ? Math.round(el.scrollLeft / el.clientWidth) : 0;
  };
  const open = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation(); // 卡片本身也會開，別開兩次
    onOpen?.(current());
  };
  return (
    <div className="cover-wrap" {...(onOpen ? {
      role: 'button', tabIndex: 0, 'aria-label': `看「${alt}」的照片（${urls.length} 張）`,
      onClick: open,
      onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); } },
    } : {})}>
      <div ref={strip} className="cover">
        {urls.map((u, i) => <img key={u} src={u} alt={i === 0 ? alt : `${alt}（第 ${i + 1} 張）`} loading="lazy" />)}
      </div>
      {urls.length > 1 && <span className="cover-count" aria-hidden="true">{urls.length} 張</span>}
    </div>
  );
}
