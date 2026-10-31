import type { MouseEvent } from 'react';

/** 整張卡片都能點開：點到卡片裡的按鈕、連結（收藏、刪除、地圖）就交給它們自己，不開詳細頁。 */
export const onCardClick = (open: () => void) => (e: MouseEvent) => {
  if ((e.target as Element).closest('button, a, input, select, textarea, label, [role="button"]')) return;
  // 在選文字（拖曳反白）就不開
  if (window.getSelection?.()?.toString()) return;
  open();
};
