import type { CSSProperties, ReactNode } from 'react';
import { useReveal } from '../lib/useReveal';

/** 滾動進場包裝：index 決定 stagger 延遲（60ms/個，上限 300ms）。 */
export default function Reveal({ index = 0, children }: { index?: number; children: ReactNode }) {
  const ref = useReveal();
  const style = { '--reveal-delay': `${Math.min(index * 60, 300)}ms` } as CSSProperties;
  return <div ref={ref} style={style}>{children}</div>;
}
