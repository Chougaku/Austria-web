import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** 開著的視窗，最上面那個才吃 Esc（詳細頁上面再開全螢幕照片時，Esc 只關照片）。 */
const stack: symbol[] = [];

/** 彈出視窗：掛到 body（卡片外層有做動畫的 transform，不掛出去 position: fixed 會跟著卡片跑），
    Esc、點背景都會關，開著時背景不捲動，關掉後焦點回到原本按的地方。 */
export default function Modal({ label, onClose, children, className = '', backdropClassName = '' }: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  backdropClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const id = Symbol(label);
    stack.push(id);
    const before = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === id) close.current();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      stack.splice(stack.indexOf(id), 1);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [label]);

  return createPortal(
    <div className={`modal-backdrop ${backdropClassName}`} onClick={() => close.current()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
        className={`modal ${className}`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="關閉" onClick={() => close.current()}>✕</button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
