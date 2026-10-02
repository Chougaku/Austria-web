/** 從台灣出發，以台灣時間（UTC+8）零時起算。 */
export function countdownDays(tripStart: string, now = new Date()): number {
  const dep = new Date(`${tripStart}T00:00:00+08:00`).getTime();
  return Math.max(0, Math.ceil((dep - now.getTime()) / 86400000));
}
