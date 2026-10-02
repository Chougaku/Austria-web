/** 行程備註（`- 時段｜標題｜備註`）裡的網址切成可點片段。
 *  支援 markdown 行內連結 `[班表](https://…)`，以及裸網址。
 *  備註慣用 `・` 分隔欄位，所以裸網址遇到全形標點就結束。 */
export type NoteSegment = { text: string; href?: string };

const LINK_RE = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s・｜、。，）】]+)/g;
const TRAILING_PUNCT = /[.,;:!?)\]]+$/;

export function linkifyNote(note: string): NoteSegment[] {
  const out: NoteSegment[] = [];
  let last = 0;
  for (const m of note.matchAll(LINK_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ text: note.slice(last, start) });
    if (m[1]) {
      out.push({ text: m[1], href: m[2] });
      last = start + m[0].length;
    } else {
      const raw = m[3];
      const trail = raw.match(TRAILING_PUNCT)?.[0] ?? '';
      const url = trail ? raw.slice(0, -trail.length) : raw;
      out.push({ text: url, href: url });
      last = start + url.length;
    }
  }
  if (last < note.length) out.push({ text: note.slice(last) });
  return out;
}
