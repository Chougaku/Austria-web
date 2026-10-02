import type { Day } from '../data/schema';

/** 不合法欄位的座標。提交會一次送出全部天數，但編輯畫面一次只顯示一天——
    錯誤若只有一句話，使用者會被指到一列自己看不到、也點不到的欄位。 */
export type InvalidField = {
  dayIdx: number;
  /** 整天沒有時段時為 null（沒有可聚焦的欄位）。 */
  slotIdx: number | null;
  field: 'time' | 'title' | null;
  message: string;
};

/** 找出第一個擋住提交的欄位，連同它在哪一天、第幾個時段。 */
export function findInvalidField(days: Day[]): InvalidField | null {
  for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
    const d = days[dayIdx];
    if (d.slots.length === 0) {
      return { dayIdx, slotIdx: null, field: null, message: `${d.label} 至少要有一個時段` };
    }
    for (let slotIdx = 0; slotIdx < d.slots.length; slotIdx++) {
      const s = d.slots[slotIdx];
      const where = `${d.label} 第 ${slotIdx + 1} 個時段`;
      if (!s.time.trim()) {
        return { dayIdx, slotIdx, field: 'time', message: `${where}的「時間」是空的` };
      }
      if (!s.pending && !s.title.trim()) {
        return { dayIdx, slotIdx, field: 'title', message: `${where}的「標題」是空的` };
      }
    }
  }
  return null;
}

/** 帶著座標的驗證錯誤，讓 UI 能把使用者帶到出問題的那一列。 */
export class ItineraryValidationError extends Error {
  field: InvalidField;
  constructor(field: InvalidField) {
    super(field.message);
    this.name = 'ItineraryValidationError';
    this.field = field;
  }
}
