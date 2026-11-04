import { useMemo, useRef, useState } from 'react';
import { guides as builtGuides } from '../data';
import type { Guide } from '../data/schema';
import MarkdownBody from '../components/MarkdownBody';
import SearchField from '../components/SearchField';
import HitText from '../components/HitText';
import Chip from '../components/Chip';
import GuideStar from '../components/GuideStar';
import { useTripState } from '../state/store';
import { tokenize, matchesTokens, makeSegments, makeSnippet } from '../lib/search';
import { useMarkText } from '../lib/useMarkText';
import AddGuide from '../components/AddGuide';
import { AddButton, AddedNotice } from '../components/AddFlow';
import { useAddFlow } from '../lib/useAddFlow';
import DeleteButton from '../components/DeleteButton';
import { deleteItem, getGuideRaw, type GuideRaw } from '../api/add';
import { useAuth } from '../state/auth';
import { deletedKey, markDeleted, useDeleted } from '../lib/deleted';

const NL = String.fromCharCode(10);

function GuideCard({ g, tokens, isOpen, onToggle }: {
  g: Guide; tokens: string[]; isOpen: boolean; onToggle: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  useMarkText(bodyRef, tokens, isOpen);
  const snippet = tokens.length > 0 ? makeSnippet(g.body, tokens) : null;
  const { canEdit } = useAuth();
  // 編輯：先從 vault 讀原始內容（網站上的是建置過的版本，拿來改會把 wikilink、圖片寫壞）
  const [edit, setEdit] = useState<null | 'loading' | { raw: GuideRaw } | { error: string }>(null);
  const [saved, setSaved] = useState(false);
  const startEdit = () => {
    setSaved(false);
    setEdit('loading');
    getGuideRaw(g.id).then((raw) => setEdit({ raw }), (e: unknown) => setEdit({ error: e instanceof Error ? e.message : '讀不到攻略內容' }));
  };

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
        {canEdit && !edit && (
          <button type="button" className="btn-plain detail-edit" onClick={(e) => { e.stopPropagation(); startEdit(); }}>編輯</button>
        )}
        <DeleteButton name={g.title} confirmText={`確定刪除攻略「${g.title}」？${NL}會連同它的圖片從 vault 刪掉，網站重建後就不見了。`}
          onDelete={async () => { await deleteItem({ kind: 'guide', id: g.id }); markDeleted(deletedKey.guide(g.id)); }} />
        <span className="serif" style={{ fontSize: 13, color: 'var(--red)', fontWeight: 700, flex: 'none' }}>
          {isOpen ? '收合 ▲' : '展開 ▼'}
        </span>
      </div>
      {saved && (
        <div role="status" className="plan-msg plan-msg--ok guide-saved">
          <span className="plan-msg-mark" aria-hidden="true">✓</span>已儲存，網站重建後（約 1–2 分鐘）重新整理就會更新
        </div>
      )}
      {edit && (
        <div className="guide-edit dash-top">
          {edit === 'loading' ? <p className="guide-edit-note">讀取原始內容…</p>
            : 'error' in edit ? (
              <div role="alert" className="plan-msg plan-msg--err" style={{ marginTop: 0 }}>
                <span className="plan-msg-mark" aria-hidden="true">！</span>{edit.error}
                <button type="button" className="btn-plain add-form-btn" style={{ marginLeft: 'auto' }} onClick={() => setEdit(null)}>關閉</button>
              </div>
            ) : (
              <AddGuide edit={{ guide: g, raw: edit.raw }} onCancel={() => setEdit(null)}
                onAdded={() => { setEdit(null); setSaved(true); }} />
            )}
        </div>
      )}
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
  const add = useAddFlow();

  const deleted = useDeleted();
  // 剛從網站刪掉的先藏起來（網站重建後 vault 裡就沒有了）
  const guides = builtGuides.filter((g) => !deleted.has(deletedKey.guide(g.id)));
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
        {!add.open && <AddButton label="攻略" onClick={add.start} />}
      </div>
      <AddedNotice names={add.added} />
      {add.open && <AddGuide onCancel={add.cancel} onAdded={add.done} />}
      <div style={{ fontSize: 12.5, color: 'var(--brown)' }}>
        別人分享的奧地利、慕尼黑攻略與清單（來自部落格／Threads／Google Maps），僅供參考。
      </div>
      {shown.length === 0 && (
        <div className="card" style={{ padding: '18px 20px', fontSize: 13, color: 'var(--brown)' }}>
          {guides.length === 0 ? '還沒有攻略。按「＋ 新增攻略」貼上第一篇，或放進 vault 的 原始資料/別人行程/。' : '沒有符合的攻略'}
        </div>
      )}
      {shown.map((g) => (
        <GuideCard key={g.id} g={g} tokens={tokens} isOpen={!!open[g.id]} onToggle={() => toggle(g.id)} />
      ))}
    </div>
  );
}
