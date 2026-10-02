import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { Entity } from '../data/schema';
import { tokenize, rankEntities, makeSegments } from '../lib/search';
import { useTripState } from '../state/store';
import HitText from './HitText';

const fieldStyle: CSSProperties = {
  width: '100%', fontFamily: 'inherit', fontSize: 13, padding: '6px 8px 6px 28px',
  border: '1px solid var(--line-dark)', borderRadius: 6, background: 'var(--card)', color: 'var(--ink)',
};

export default function EntityPicker({ value, disabled, placeholder, fieldId, onChangeTitle, onPick }: {
  value: string;
  disabled?: boolean;
  placeholder: string;
  /** 供提交驗證失敗時定位聚焦用。 */
  fieldId?: string;
  onChangeTitle: (title: string) => void;
  onPick: (entity: Entity) => void;
}) {
  const { favs } = useTripState();
  const favIds = useMemo(
    () => new Set(Object.keys(favs).filter((k) => favs[k]).map((k) => k.slice(4))),
    [favs],
  );
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tokens = useMemo(() => tokenize(value), [value]);
  const results = useMemo(() => rankEntities(value, favIds), [value, favIds]);
  const favCount = useMemo(() => results.filter((e) => favIds.has(e.id)).length, [results, favIds]);
  const hasQuery = tokens.length > 0;

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => { setHi(0); }, [value, open]);

  const pick = (e: Entity) => { onPick(e); setOpen(false); };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) { if (e.key === 'ArrowDown') setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { if (results[hi]) { e.preventDefault(); pick(results[hi]); } }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', pointerEvents: 'none', color: 'var(--brown-lt)', opacity: disabled ? .4 : 1,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.2" y2="16.2" />
        </svg>
      </span>
      <input
        data-slot-field={fieldId}
        style={{ ...fieldStyle, opacity: disabled ? .5 : 1 }}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => { onChangeTitle(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && !disabled && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 5, maxHeight: 280, overflowY: 'auto',
          background: 'var(--card)', border: '1px solid var(--line-dark)', borderRadius: 8,
          boxShadow: '0 8px 22px rgba(34,32,28,.16)', zIndex: 50, padding: '4px 0',
        }}>
          {results.length === 0 ? (
            <div style={{ padding: '14px 14px', fontSize: 12.5, color: 'var(--brown)', textAlign: 'center' }}>
              查無符合的地點，可直接打字輸入
            </div>
          ) : (
            <>
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                padding: '5px 13px 6px', fontSize: 10.5, letterSpacing: '.06em', color: 'var(--brown)',
                borderBottom: '1px solid var(--line)',
              }}>
                <span>{hasQuery ? `符合「${value.trim()}」` : '選擇地點'}</span>
                {favCount > 0 && <span style={{ color: 'var(--red)', fontWeight: 700 }}>♥ {favCount} 已標記</span>}
              </div>
              {results.map((e, i) => {
                const fav = favIds.has(e.id);
                const active = i === hi;
                const showDivider = i === favCount && favCount > 0 && favCount < results.length;
                return (
                  <div key={e.id}>
                    {showDivider && (
                      <div style={{
                        padding: '6px 13px 3px', fontSize: 10, letterSpacing: '.08em', color: 'var(--brown-lt)',
                      }}>其他地點</div>
                    )}
                    <button type="button" className="btn-plain"
                      onMouseEnter={() => setHi(i)}
                      onMouseDown={(ev) => { ev.preventDefault(); pick(e); }}
                      style={{
                        display: 'flex', width: '100%', alignItems: 'baseline', gap: 8, textAlign: 'left',
                        padding: '8px 13px 8px 12px', cursor: 'pointer', fontSize: 13,
                        borderLeft: `3px solid ${fav ? 'var(--red)' : 'transparent'}`,
                        background: active
                          ? 'rgba(34,32,28,.07)'
                          : fav ? 'rgba(200,16,46,.055)' : 'transparent',
                      }}>
                      <span style={{
                        flex: 'none', width: 14, textAlign: 'center', fontSize: 11,
                        color: 'var(--red)', opacity: fav ? 1 : 0,
                      }}>♥</span>
                      <span className="serif" style={{
                        fontWeight: 700, flex: 1, minWidth: 0, lineHeight: 1.35,
                        color: fav ? 'var(--red)' : 'var(--ink)',
                      }}>
                        <HitText segments={makeSegments(e.name, tokens)} />
                      </span>
                      <span style={{ flex: 'none', fontSize: 11, color: 'var(--brown)' }}>{e.category}・{e.area}</span>
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
