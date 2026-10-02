import { useEffect, type RefObject } from 'react';

export function useMarkText(ref: RefObject<HTMLElement | null>, tokens: string[], enabled: boolean): void {
  const key = tokens.join(' ');
  useEffect(() => {
    const root = ref.current;
    const toks = key ? key.split(' ') : [];
    if (!enabled || !root || toks.length === 0) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) textNodes.push(n as Text);

    const marks: HTMLElement[] = [];
    for (const node of textNodes) {
      let current = node;
      for (;;) {
        const lower = current.data.toLowerCase();
        let first = -1;
        let len = 0;
        for (const t of toks) {
          const i = lower.indexOf(t);
          if (i !== -1 && (first === -1 || i < first)) {
            first = i;
            len = t.length;
          }
        }
        if (first === -1) break;
        const matchNode = current.splitText(first);
        const rest = matchNode.splitText(len);
        const mark = document.createElement('mark');
        mark.className = 'search-hit';
        matchNode.parentNode!.insertBefore(mark, matchNode);
        mark.appendChild(matchNode);
        marks.push(mark);
        current = rest;
      }
    }

    return () => {
      for (const mark of marks) {
        const parent = mark.parentNode;
        if (!parent) continue;
        while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
        parent.removeChild(mark);
        parent.normalize();
      }
    };
  }, [ref, key, enabled]);
}
