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
    // 圖片接在備註後面：vault 裡的檔案寫成 Obsidian 嵌入，外部網址寫成標準 markdown 圖片
    const tail = [s.note, ...(s.images ?? []).map(imageMd)].filter(Boolean).join(' ');
    if (s.pending) lines.push(`- ${s.time}｜（待安排）`);
    else if (tail) lines.push(`- ${s.time}｜${s.title}｜${tail}`);
    else lines.push(`- ${s.time}｜${s.title}`);
  }
  return lines.join('\n');
}

const imageMd = ({ file }: { file: string }) => (/^https?:\/\//i.test(file) ? `![](${file})` : `![[${file}]]`);
