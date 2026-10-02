import { useMemo, useRef, useState } from 'react';
import { guides } from '../data';
import type { Guide } from '../data/schema';
import MarkdownBody from '../components/MarkdownBody';
import SearchField from '../components/SearchField';
import HitText from '../components/HitText';
import Chip from '../components/Chip';
import GuideStar from '../components/GuideStar';
import { useTripState } from '../state/store';
import { tokenize, matchesTokens, makeSegments, makeSnippet } from '../lib/search';
import { useMarkText } from '../lib/useMarkText';

function GuideCard({ g, tokens, isOpen, onToggle }: {
  g: Guide; tokens: string[]; isOpen: boolean; onToggle: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  useMarkText(bodyRef, tokens, isOpen);
  const snippet = tokens.length > 0 ? makeSnippet(g.body, tokens) : null;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="card-tap" onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px', cursor: 'pointer',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="serif" style={{ fontSize: 17, fontWeight: 800 }}>
            <HitText segments={makeSegments(g.title, tokens)} />
          </div>
          {g.source && (
            <div style={{ fontSize: 12, color: 'var(--brown)', marginTop: 3 }}>
              來源：{g.sourceUrl ? (
                <a href={g.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  {g.source} ↗
                </a>
              ) : g.source}
            </div>
          )}
          {snippet && (
            <div data-testid="guide-snippet" style={{ fontSize: 12.5, color: 'var(--brown-dk)', marginTop: 5 }}>
              <HitText segments={snippet} />
            </div>
          )}
        </div>
        <GuideStar guideId={g.id} />
        <span className="serif" style={{ fontSize: 13, color: 'var(--red)', fontWeight: 700, flex: 'none' }}>
          {isOpen ? '收合 ▲' : '展開 ▼'}
        </span>
      </div>
      <div className={`guide-body${isOpen ? ' guide-body--open' : ''}`} aria-hidden={!isOpen}>
        <div>
          <div ref={bodyRef} className="dash-top" style={{ padding: '2px 22px 18px' }}>
            <MarkdownBody>{g.body}</MarkdownBody>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Guides() {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState('');
  const [onlyFav, setOnlyFav] = useState(false);
  const { isGuideFav } = useTripState();
  const tokens = useMemo(() => tokenize(q), [q]);
  const toggle = (id: string) => setOpen((s) => ({ ...s, [id]: !s[id] }));

  const hasFav = guides.some((g) => isGuideFav(g.id));
  const searched = tokens.length === 0
    ? guides
    : guides.filter((g) => matchesTokens(`${g.title} ${g.body}`, tokens));
  const filtered = onlyFav ? searched.filter((g) => isGuideFav(g.id)) : searched;
  // 典藏置頂；Array.prototype.sort 是 stable sort，各群內維持原順序
  const shown = [...filtered].sort((a, b) => Number(isGuideFav(b.id)) - Number(isGuideFav(a.id)));

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 820 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <SearchField value={q} onChange={setQ} placeholder="搜尋攻略內容…" />
        {(hasFav || onlyFav) && (
          <Chip on={onlyFav} red onClick={() => setOnlyFav((o) => !o)}>★ 只看典藏</Chip>
        )}
        {tokens.length > 0 && (
          <span style={{ fontSize: 12.5, color: 'var(--brown)' }}>符合 {shown.length} 篇</span>
        )}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--brown)' }}>
        別人分享的奧地利、慕尼黑攻略與清單（來自部落格／Threads／Google Maps），僅供參考。
      </div>
      {shown.length === 0 && (
        <div className="card" style={{ padding: '18px 20px', fontSize: 13, color: 'var(--brown)' }}>
          沒有符合的攻略
        </div>
      )}
      {shown.map((g) => (
        <GuideCard key={g.id} g={g} tokens={tokens} isOpen={!!open[g.id]} onToggle={() => toggle(g.id)} />
      ))}
    </div>
  );
}
