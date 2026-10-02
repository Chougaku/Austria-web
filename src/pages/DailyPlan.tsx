import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useItinerary } from '../state/itinerary';
import { configured } from '../api/state';
import type { Day, DaySlot } from '../data/schema';
import AreaRail from '../components/AreaRail';
import TripMap from '../components/TripMap';
import Reveal from '../components/Reveal';
import EntityPicker from '../components/EntityPicker';
import MapLink from '../components/MapLink';
import { slotKind, slotArea, slotMapTarget, isMarked, SLOT_KIND_META, MARKED_KINDS } from '../lib/slot-kind';
import { linkifyNote } from '../lib/linkify';
import { ItineraryValidationError } from '../lib/itinerary-validate';
import { cityOfArea, type CityKey } from '../data/areas';
import { LEG_META, dayIso, legsOn, stayOnNight, todayIndex } from '../lib/trip';

type View = 'timeline' | 'cards' | 'map';
const VIEWS: [View, string][] = [['timeline', '時間軸'], ['cards', '卡片'], ['map', '地圖']];

export default function DailyPlan() {
  const { days, saving, updateSlot, addSlot, removeSlot, moveSlot, save, reset } = useItinerary();
  // 旅途中打開就直接停在今天；行前或行後從 Day 0 開始。
  const [dayIdx, setDayIdx] = useState(() => Math.max(0, todayIndex(days)));
  const [view, setView] = useState<View>('timeline');
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [focusField, setFocusField] = useState<{ slotIdx: number; field: 'time' | 'title' } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const daysRef = useRef<HTMLDivElement>(null);
  const day = days[dayIdx] ?? days[0];
  const canEdit = configured();

  const onSave = async () => {
    setMsg(null);
    try { await save(); setMsg({ text: '已提交，網站將於重建後更新', ok: true }); setEditing(false); }
    catch (e) {
      // 提交送的是全部天數，畫面卻只顯示一天——沒填完的欄位可能在別天，
      // 光報錯等於指向一列使用者看不到也點不到的欄位，所以要主動把他帶過去。
      if (e instanceof ItineraryValidationError) {
        setDayIdx(e.field.dayIdx);
        if (e.field.slotIdx !== null && e.field.field !== null) {
          setFocusField({ slotIdx: e.field.slotIdx, field: e.field.field });
        }
      }
      setMsg({ text: e instanceof Error ? e.message : '提交失敗', ok: false });
    }
  };

  useEffect(() => {
    if (!focusField) return;
    const el = cardRef.current?.querySelector<HTMLInputElement>(
      `[data-slot-field="${focusField.slotIdx}-${focusField.field}"]`,
    );
    if (!el) return;
    el.focus({ preventScroll: true });
    // 置中而非貼齊邊緣：放不下訊息時這是唯一的落點，貼在視窗最下緣的話
    // 手機鍵盤一彈出來就蓋住要填的欄位。
    el.scrollIntoView?.({ block: 'center' });
    // 訊息若被推到視窗上緣外，使用者只會看到畫面莫名跳到別天。
    // 兩者塞得下就往回捲到訊息，塞不下就維持欄位置中。
    const banner = cardRef.current?.querySelector('.plan-msg');
    const top = banner?.getBoundingClientRect().top ?? 0;
    if (banner && top < 0 && el.getBoundingClientRect().bottom - top <= window.innerHeight) {
      window.scrollBy(0, top);
    }
    setFocusField(null);
  }, [focusField]);
  const onCancel = () => { reset(); setEditing(false); setMsg(null); };

  // 17 天的日期列在手機上一定要橫捲：選中的那天要捲進畫面（包含一打開就跳到今天）。
  useEffect(() => {
    const el = daysRef.current?.querySelector<HTMLElement>(`[data-day-idx="${dayIdx}"]`);
    el?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [dayIdx]);

  const iso = dayIso(day);
  const stay = stayOnNight(iso);
  const legs = legsOn(iso);

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="plan-head">
        <div className="hscroll plan-days" ref={daysRef}>
          {days.map((d, i) => {
            const [date, dow] = d.date.split(/\s+/);
            const dayLegs = legsOn(dayIso(d));
            // 換城那天在日期鈕上標一個小符號；同一天有飛機又有車，標陸路那段。
            const move = dayLegs.find((l) => l.mode !== 'flight') ?? dayLegs[0];
            return (
              <button key={d.label} data-day-idx={i} className="btn-plain plan-day" onClick={() => setDayIdx(i)} style={{
                background: dayIdx === i ? 'var(--ink)' : 'transparent',
                color: dayIdx === i ? '#F8F5EE' : 'var(--ink)',
                border: dayIdx === i ? '1px solid var(--ink)' : '1px solid rgba(34,32,28,.3)',
                borderRadius: 8, cursor: 'pointer', textAlign: 'center',
              }}>
                <span style={{ display: 'block', fontSize: 11, letterSpacing: '.06em', opacity: .75 }}>
                  {date}{dow && <span className="plan-day-dow"> {dow}</span>}
                </span>
                <span className="serif" style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>
                  {d.label}
                  {move && <span className="plan-day-mode" aria-label={LEG_META[move.mode].label}>{LEG_META[move.mode].glyph}</span>}
                </span>
              </button>
            );
          })}
        </div>
        <div className="plan-views">
          {VIEWS.map(([k, label]) => (
            <button key={k} className="btn-plain" onClick={() => setView(k)} style={{
              background: view === k ? 'var(--red)' : 'transparent',
              color: view === k ? '#F8F5EE' : 'var(--ink)',
              padding: '9px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {view === 'timeline' && (
        <div className="card plan-card" ref={cardRef}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
            <span className="serif" style={{ fontSize: 20, fontWeight: 800, color: 'var(--red)' }}>{day.label}</span>
            <span className="serif" style={{ fontSize: 16, fontWeight: 700 }}>{day.theme}</span>
            {/* 星期只在這裡出現一次——日期已在上方選中的日期鈕上，手機為了省寬度隱去星期。 */}
            <span style={{ fontSize: 11.5, color: 'var(--brown)', letterSpacing: '.04em' }}>
              {[day.date.split(/\s+/)[1], ...day.areas].filter(Boolean).join('・')}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              {canEdit ? (
                editing ? (
                  <>
                    <button className="btn-plain" onClick={onCancel} disabled={saving} style={editBtn(false)}>取消</button>
                    <button className="btn-plain" onClick={onSave} disabled={saving} style={editBtn(true)}>
                      {saving ? '提交中…' : '儲存並提交'}
                    </button>
                  </>
                ) : (
                  <button className="btn-plain" onClick={() => setEditing(true)} style={editBtn(false)}>編輯</button>
                )
              ) : (
                <span style={{ fontSize: 11.5, color: 'var(--brown-lt)' }}>登入後可編輯</span>
              )}
            </div>
            {/* 多城市行程最常被問的兩件事：今天怎麼移動、今晚睡哪。 */}
            {(legs.length > 0 || stay) && (
              <div className="plan-where" style={{ flexBasis: '100%' }}>
                {legs.map((l) => (
                  <span key={`${l.from}${l.to}`} className={`plan-leg plan-leg--${l.mode}`}>
                    <span aria-hidden="true">{LEG_META[l.mode].glyph}</span>
                    {LEG_META[l.mode].label}・{l.from} → {l.to}
                  </span>
                ))}
                {stay && (
                  <span>
                    今晚住 <b style={{ color: 'var(--ink)' }}>{stay.city}</b>・
                    {stay.booked ? stay.hotel : <span className="badge badge--todo">住宿待訂</span>}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 提交結果必須一眼看得出成功或失敗——舊版成功與錯誤都是同一行褐色小字，
              連按幾次又只是重設同一句話，使用者只會覺得「按了沒反應」。 */}
          {msg && (
            <div role="status" className={`plan-msg ${msg.ok ? 'plan-msg--ok' : 'plan-msg--err'}`}>
              <span className="plan-msg-mark" aria-hidden="true">{msg.ok ? '✓' : '！'}</span>
              {msg.text}
            </div>
          )}

          {editing ? (
            <EditableSlots dayIdx={dayIdx} slots={day.slots}
              onUpdate={updateSlot} onAdd={addSlot} onRemove={removeSlot} onMove={moveSlot} />
          ) : (
            <div style={{ marginTop: 2 }}>
              <KindLegend />
              {day.slots.map((s, i) => {
                const kind = s.pending ? null : slotKind(s.title);
                const meta = isMarked(kind) ? SLOT_KIND_META[kind] : null;
                const map = slotMapTarget(s);
                return (
                  <div key={i} className={[
                    'plan-slot',
                    s.pending ? 'plan-slot--pending' : '',
                    isMarked(kind) ? `plan-slot--${kind}` : '',
                  ].filter(Boolean).join(' ')}>
                    <div className="plan-slot-head">
                      <span className="plan-time">{s.time}</span>
                      {meta && <span className="plan-kind" title={meta.label} aria-label={meta.label}>{meta.glyph}</span>}
                      <span className="plan-title">{s.pending ? '待安排' : s.title}</span>
                      {/* 人在維也納街頭看這頁，下一步幾乎都是「這間在哪、怎麼走」——
                          地圖連結貼齊右緣排成一直行，掃視時不會跟標題擠在一起。 */}
                      {map && (
                        <span className="plan-map">
                          <MapLink name={map.name} area={map.area} />
                        </span>
                      )}
                    </div>
                    {(s.pending || s.note) && (
                      <div className="plan-note">
                        {s.pending ? '空白時段，到 Obsidian 填 — 或從美食庫挑一間' : linkifyNote(s.note).map((seg, j) => (
                          seg.href
                            ? <a key={j} href={seg.href} target="_blank" rel="noreferrer">{seg.text}</a>
                            : <span key={j}>{seg.text}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view === 'cards' && (
        <div>
        <KindLegend dot />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(205px, 1fr))', gap: 12 }}>
          {days.map((d, i) => (
            <Reveal key={d.label} index={i}>
            <div className="card" style={{ padding: '16px 18px', borderColor: i === dayIdx ? 'var(--red)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid var(--ink)', paddingBottom: 8 }}>
                <span className="serif" style={{ fontSize: 17, fontWeight: 800 }}>{d.label}</span>
                <span style={{ fontSize: 11, color: 'var(--brown)', letterSpacing: '.06em' }}>{d.date}</span>
              </div>
              <div className="serif" style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)', marginTop: 10 }}>{d.theme}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {d.slots.map((s, j) => {
                  const kind = s.pending ? null : slotKind(s.title);
                  return (
                    <div key={j} style={{
                      fontSize: 12.5, lineHeight: 1.5,
                      color: s.pending ? 'var(--brown-lt)' : 'var(--ink)',
                      ...(s.pending ? { border: '1px dashed rgba(34,32,28,.25)', borderRadius: 6, padding: '5px 9px' } : { padding: '2px 0' }),
                    }}>
                      {/* 卡片檢視沒有「食／景」小方章，也塞不下整列色帶，改成一顆點；
                          未標記的類型留空白佔位維持對齊。 */}
                      <span className="plan-dot" style={{
                        background: isMarked(kind) ? SLOT_KIND_META[kind].color : 'transparent',
                      }} />
                      <span style={{ fontWeight: 700, color: 'var(--brown)', fontSize: 11, letterSpacing: '.05em' }}>{s.time}</span>{' '}
                      {s.pending ? '待安排' : s.title}
                    </div>
                  );
                })}
              </div>
            </div>
            </Reveal>
          ))}
        </div>
        </div>
      )}

      {view === 'map' && <DayMap day={day} />}
    </div>
  );
}

/** 地圖檢視：區域列＋當天時段掛在各自的區域上（同一套美食／景點配色）。
    高亮的依據改成「當天實際有時段落在這一區」，而不是 vault 手寫的 areas——
    兩者不一致時以時段為準，才不會出現「亮著卻沒東西」或反過來。 */
function DayMap({ day }: { day: Day }) {
  const placed = new Map<string, DaySlot[]>();
  const unplaced: DaySlot[] = [];
  for (const s of day.slots) {
    const area = slotArea(s);
    if (!area) { unplaced.push(s); continue; }
    const list = placed.get(area);
    if (list) list.push(s); else placed.set(area, [s]);
  }
  const areas = Array.from(new Set([...placed.keys(), ...day.areas]));
  // 區域列只列當天經過的城市；夜班機那種一個區域都沒有的日子就整條列出來。
  const cities = Array.from(new Set(areas.map((a) => cityOfArea(a)?.key).filter((k): k is CityKey => !!k)));

  return (
    <div className="card plan-card">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span className="serif" style={{ fontSize: 20, fontWeight: 800, color: 'var(--red)' }}>{day.label}</span>
        <span style={{ fontSize: 12.5, color: 'var(--brown-dk)' }}>{day.theme}・當日活動區域以紅色標示</span>
      </div>
      <TripMap
        highlightAreas={areas}
        popupFor={(a) => (placed.get(a.name) ?? []).map((s) => `${s.time}｜${s.pending ? '待安排' : s.title}`)}
      />
      <div style={{ height: 14 }} />
      <KindLegend dot />
      <AreaRail
        highlightAreas={areas}
        showCounts={false}
        cities={cities.length ? cities : undefined}
        renderExtra={(a) => {
          const slots = placed.get(a.name);
          if (!slots) return null;
          return (
            <div className="area-slots">
              {slots.map((s, i) => <DaySlotLine key={i} slot={s} />)}
            </div>
          );
        }}
      />
      {unplaced.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--brown-dk)' }}>
          <span style={{ color: 'var(--brown-lt)' }}>未定位：</span>
          {unplaced.map((s) => s.pending ? '待安排' : s.title).join('・')}
        </div>
      )}
    </div>
  );
}

/** 掛在區域卡片上的單一時段：色點＋時段＋標題。 */
function DaySlotLine({ slot }: { slot: DaySlot }) {
  const kind = slot.pending ? null : slotKind(slot.title);
  return (
    <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
      <span className="plan-dot" style={{
        background: isMarked(kind) ? SLOT_KIND_META[kind].color : 'transparent',
      }} />
      <span style={{ fontWeight: 700, color: 'var(--brown)', fontSize: 11, letterSpacing: '.05em' }}>
        {slot.time}
      </span>{' '}
      {slot.pending ? '待安排' : slot.title}
    </div>
  );
}

/** 只標「美食／景點」兩色的圖例——其餘類型走茶色，看字就懂，不必進圖例。
    dot＝卡片檢視用的色點版本，對應該檢視的標記樣式。 */
function KindLegend({ dot }: { dot?: boolean }) {
  return (
    <div className="plan-legend">
      {MARKED_KINDS.map((k) => {
        const m = SLOT_KIND_META[k];
        return (
          <span key={k} className="plan-legend-item">
            {dot
              ? <span className="plan-dot" style={{ background: m.color }} />
              : <span className={`plan-kind plan-slot--${k}`}>{m.glyph}</span>}
            {m.label}
          </span>
        );
      })}
    </div>
  );
}

function editBtn(primary: boolean): CSSProperties {
  return {
    padding: '6px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', borderRadius: 8,
    background: primary ? 'var(--red)' : 'transparent',
    color: primary ? '#F8F5EE' : 'var(--ink)',
    border: `1px solid ${primary ? 'var(--red)' : 'rgba(34,32,28,.3)'}`,
  };
}

function EditableSlots({ dayIdx, slots, onUpdate, onAdd, onRemove, onMove }: {
  dayIdx: number; slots: DaySlot[];
  onUpdate: (di: number, si: number, patch: Partial<DaySlot>) => void;
  onAdd: (di: number) => void;
  onRemove: (di: number, si: number) => void;
  onMove: (di: number, si: number, dir: -1 | 1) => void;
}) {
  const field: CSSProperties = {
    fontFamily: 'inherit', fontSize: 13, padding: '6px 8px',
    border: '1px solid var(--line-dark)', borderRadius: 6, background: 'var(--card)', color: 'var(--ink)',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
      {slots.map((s, i) => (
        <div key={i} className="slot-edit-row">
          <input style={field} value={s.time} placeholder="時段" data-slot-field={`${i}-time`}
            onChange={(e) => onUpdate(dayIdx, i, { time: e.target.value })} />
          <EntityPicker
            value={s.pending ? '' : s.title}
            placeholder={s.pending ? '待安排' : '標題（可打字或選單）'}
            fieldId={`${i}-title`}
            disabled={s.pending}
            onChangeTitle={(title) => onUpdate(dayIdx, i, { title })}
            onPick={(entity) => onUpdate(dayIdx, i, { title: entity.name, ...(!s.note.trim() ? { note: entity.area } : {}) })}
          />
          <input style={{ ...field, opacity: s.pending ? .5 : 1 }} value={s.pending ? '' : s.note} placeholder="備註"
            disabled={s.pending}
            onChange={(e) => onUpdate(dayIdx, i, { note: e.target.value })} />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <label style={{ fontSize: 11, color: 'var(--brown)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <input type="checkbox" checked={s.pending}
                onChange={(e) => onUpdate(dayIdx, i, { pending: e.target.checked })} />待安排
            </label>
            <button className="btn-plain" title="上移" onClick={() => onMove(dayIdx, i, -1)} style={iconBtn}>↑</button>
            <button className="btn-plain" title="下移" onClick={() => onMove(dayIdx, i, 1)} style={iconBtn}>↓</button>
            <button className="btn-plain" title="刪除" onClick={() => onRemove(dayIdx, i)} style={{ ...iconBtn, color: 'var(--red)' }}>✕</button>
          </div>
        </div>
      ))}
      <button className="btn-plain" onClick={() => onAdd(dayIdx)} style={{
        alignSelf: 'flex-start', padding: '6px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
        borderRadius: 8, border: '1px dashed rgba(34,32,28,.4)', background: 'transparent', color: 'var(--ink)',
      }}>＋ 新增時段</button>
    </div>
  );
}

const iconBtn: CSSProperties = {
  width: 26, height: 26, cursor: 'pointer', borderRadius: 6,
  border: '1px solid rgba(34,32,28,.25)', background: 'var(--card)', color: 'var(--ink)', fontSize: 13,
};
