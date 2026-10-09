import { useState } from 'react';
import { useAuth } from '../state/auth';

/** 「＋ 新增」的共用流程：沒登入先跳登入框；送出成功後收起表單、記下剛新增的名稱（網站重建前先在畫面上說一聲）。 */
export function useAddFlow() {
  const { canEdit, openLogin } = useAuth();
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  return {
    open,
    added,
    start: () => (canEdit ? setOpen(true) : openLogin()),
    cancel: () => setOpen(false),
    done: (name: string) => { setAdded((a) => [...a, name]); setOpen(false); },
  };
}
