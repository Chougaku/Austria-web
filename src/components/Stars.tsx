import { useRef, type KeyboardEvent } from 'react';

const FIVE = [1, 2, 3, 4, 5];

/** 五顆星的評分（顯示用）：依分數填滿，4.4 就是四顆多一點。沒評分不顯示。 */
export function Stars({ value, showValue = false, size = 'sm' }: { value: number | null; showValue?: boolean; size?: 'sm' | 'md' }) {
  if (value == null) return null;
  const pct = Math.round(Math.max(0, Math.min(5, value)) * 200) / 10; // 0–100，取到一位小數
  return (
    <span className={`stars stars--${size}`} role="img" aria-label={`評分 ${value} 顆星（滿分 5）`}>
      <span className="stars-track" aria-hidden="true">
        ★★★★★
        <span className="stars-fill" style={{ width: `${pct}%` }}>★★★★★</span>
      </span>
      {showValue && <span className="stars-value">{Number.isInteger(value) ? value : value.toFixed(1)}</span>}
    </span>
  );
}

/** 點星星評分：點第幾顆就是幾顆星，再點同一顆清掉；左右方向鍵也能調。value 0＝還沒評。 */
export function StarInput({ value, onChange, disabled, label = '評分' }: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  const group = useRef<HTMLDivElement>(null);
  const focus = (n: number) => group.current?.querySelectorAll<HTMLButtonElement>('button')[n - 1]?.focus();
  const onKey = (e: KeyboardEvent, n: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); const k = Math.min(5, n + 1); onChange(k); focus(k); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); const k = Math.max(1, n - 1); onChange(k); focus(k); }
  };
  return (
    <div ref={group} className="star-input" role="radiogroup" aria-label={label}>
      {FIVE.map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} 顆星`}
          className={`star-input-btn${n <= value ? ' star-input-btn--on' : ''}`} disabled={disabled}
          tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
          onClick={() => onChange(value === n ? 0 : n)} onKeyDown={(e) => onKey(e, n)}>
          ★
        </button>
      ))}
      <span className="star-input-text">{value ? `${value} 顆星` : '還沒評分'}</span>
    </div>
  );
}
