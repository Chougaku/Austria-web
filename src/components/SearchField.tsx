import type { KeyboardEvent } from 'react';

export default function SearchField({ value, onChange, placeholder, onKeyDown }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 }}>
      <input
        className="search-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
      />
      {value && (
        <button
          className="btn-plain"
          aria-label="清除搜尋"
          onClick={() => onChange('')}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            fontSize: 15, color: 'var(--brown)', padding: '4px 6px', cursor: 'pointer', lineHeight: 1,
          }}
        >✕</button>
      )}
    </div>
  );
}
