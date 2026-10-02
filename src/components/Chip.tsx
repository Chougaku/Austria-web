import type { ReactNode } from 'react';

export default function Chip({ on, red, onClick, children }: {
  on: boolean; red?: boolean; onClick: () => void; children: ReactNode;
}) {
  return (
    <button className={`chip${on ? ' chip--on' : ''}${red ? ' chip--red' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}