import type { Day } from '../data/schema';

/** parse-itinerary 的反向：輸出從第一個 `## Day` 起的行程區塊（結尾含換行）。 */
export function serializeDays(days: Day[]): string {
  return days.map(serializeDay).join('\n\n') + '\n';
}

function serializeDay(d: Day): string {
  const lines: string[] = [`## ${d.label}｜${d.date}｜${d.theme}`];
  if (d.areas.length) lines.push(`> 區域：${d.areas.join('、')}`);
  lines.push('');
  for (const s of d.slots) {
    if (s.pending) lines.push(`- ${s.time}｜（待安排）`);
    else if (s.note) lines.push(`- ${s.time}｜${s.title}｜${s.note}`);
    else lines.push(`- ${s.time}｜${s.title}`);
  }
  return lines.join('\n');
}
