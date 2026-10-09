import { useState } from 'react';
import { countdownDays } from '../lib/countdown';
import { byCategory, entities, meta, overview, todos } from '../data';
import { CITIES, matchCity } from '../data/areas';
import { useTripState } from '../state/store';
import { useAuth } from '../state/auth';
import WishList from '../components/WishList';
import AddTodo from '../components/AddTodo';
import { AddButton, AddedNotice } from '../components/AddFlow';
import { useAddFlow } from '../lib/useAddFlow';
import GuideFavCard from '../components/GuideFavCard';
import RouteHero from '../components/RouteHero';
import DioramaScene from '../components/DioramaScene';
import { LEG_META, shortDate, totalNights } from '../lib/trip';


export default function Home() {
  const { todosState, toggleTodo, favCount, favs } = useTripState();
  const { canEdit, openLogin } = useAuth();
  const addTodo = useAddFlow();
  const [wishOpen, setWishOpen] = useState(false);
  const favEntities = entities.filter((e) => favs[`fav:${e.id}`]);
  const f = overview.fields;
  const cd = countdownDays(meta.tripStart);
  const done = todos.filter((t) => todosState[t.key]).length;
  const nights = totalNights();
  const booked = overview.stays.filter((s) => s.booked).length;
  // 季節欄常寫成「初夏・白晝長」，票根上只放第一段。
  const season = f['季節']?.split('・')[0];

  const quick: { count: number; label: string; sub: string; hash: string }[] = [
    { count: byCategory('餐廳').length, label: '美食庫', sub: '咖啡館・炸肉排・啤酒屋', hash: 'food' },
    { count: byCategory('景點').length, label: '景點', sub: '宮殿・湖區・阿爾卑斯', hash: 'places' },
    { count: byCategory('購物').length, label: '購物', sub: '伴手禮・超市・市集', hash: 'places' },
    { count: byCategory('交通').length, label: '交通', sub: '自駕・火車・市內', hash: 'trans' },
  ];

  const summary: [string, string][] = [
    ['出發', f['出發顯示'] ?? meta.tripStart],
    ['回程', f['回程顯示'] ?? meta.tripEnd],
    ['天數', f['天數'] ?? '—'],
    ['季節', f['季節'] ?? '—'],
  ];

  return (
    <div className="fade-up ov-page">
      {/* 問候列 */}
      <div className="ov-greet">
        <div className="serif ov-greet-title">Servus，旅伴 👋</div>
        <div className="ov-greet-sub">距離出發還有 {cd} 天・{CITIES.length} 座城市，一站一站蓋上郵戳</div>
      </div>

      {/* 拼貼主視覺：立體地景當底，旅券與摘要釘在上方兩角的天空 */}
      <div className="ov-stage">
        <DioramaScene />

        {/* 旅券票根卡 */}
        <div className="card ov-float ov-pass ov-pin ov-pin--pass ov-tilt ov-tilt--a">
          <div className="ov-pass-main">
            <div className="label-en" style={{ color: 'var(--red)', fontSize: 10.5 }}>REISEPASS</div>
            <div className="serif" style={{ fontSize: 21, fontWeight: 800, marginTop: 5, letterSpacing: '.04em', whiteSpace: 'nowrap' }}>奧地利・慕尼黑</div>
            <div style={{ fontSize: 12, color: 'var(--brown-dk)', marginTop: 2 }}>{season ? `${season}的` : ''}自駕＋火車之旅</div>
            <div className="ov-pass-meta dash-top" style={{ marginTop: 12, paddingTop: 11 }}>
              {[['城市', `${CITIES.length} 城`], ['住宿', `${nights} 晚`], ...(f['旅伴'] ? [['旅伴', f['旅伴']]] : [])].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10.5, color: 'var(--brown)', letterSpacing: '.1em' }}>{k}</div>
                  <div className="serif" style={{ fontSize: 14, fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="ov-pass-stub">
            <div className="serif cd-num-enter" style={{ fontSize: 46, fontWeight: 800, color: 'var(--red)', lineHeight: 1 }}>{cd}</div>
            <div className="serif" style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>日後出發</div>
            <div className="label-en ov-stub-label">COUNTDOWN</div>
          </div>
        </div>

        {/* 行程摘要（深色，釘在右上） */}
        <div className="banner-dark ov-summary ov-pin ov-pin--sum ov-tilt ov-tilt--c">
          {summary.map(([k, v]) => (
            <div key={k}>
              <div className="ov-summary-k">{k}</div>
              <div className="ov-summary-v">{v}</div>
            </div>
          ))}
        </div>

        <div className="ov-stage-cap">ÖSTERREICH &amp; BAYERN · IN MINIATUR</div>
      </div>

      {/* 手繪路線圖：六城郵戳、移動方式與日期 */}
      <RouteHero />

      <div className="ov-mid">
        {/* 住宿：6 段 */}
        <div className="card ov-float ov-tilt ov-tilt--e" style={{ padding: '18px 20px' }}>
          <div className="ov-card-head">
            <span className="label-en" style={{ fontSize: 10.5, letterSpacing: '.2em' }}>UNTERKUNFT</span>
            <span className="ov-card-title">住宿</span>
            <span style={{ fontSize: 12, color: 'var(--brown)' }}>{overview.stays.length} 段・{nights} 晚・已訂 {booked}</span>
          </div>
          <div className="stay-list">
            {overview.stays.map((s) => {
              const city = matchCity(s.city);
              return (
                <div key={s.checkIn} className="stay-row">
                  <div className="stay-mark" aria-label={`${s.nights} 晚`}>
                    <b>{s.nights}</b><span>晚</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="stay-city">
                      <b>{s.city}</b>
                      {city && <span className="stay-en">{city.en}</span>}
                    </div>
                    <div className="stay-meta">
                      {shortDate(s.checkIn)} – {shortDate(s.checkOut)}
                      {s.parking && <>・🅿 {s.parking}</>}
                      {s.note && <>・{s.note}</>}
                    </div>
                  </div>
                  <div className="stay-status">
                    {s.booked
                      ? <span className="badge badge--done">✓ {s.hotel}</span>
                      : <span className="badge badge--todo">住宿待訂</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ov-side">
          {/* 城市間移動 */}
          <div className="card ov-float ov-tilt ov-tilt--b" style={{ padding: '16px 18px' }}>
            <div className="ov-card-head">
              <span className="label-en" style={{ fontSize: 10.5, letterSpacing: '.2em' }}>ROUTE</span>
              <span className="ov-card-title">移動</span>
            </div>
            <div className="leg-list">
              {overview.legs.map((l) => (
                <div key={`${l.date}${l.from}`} className={`leg-row leg-row--${l.mode}`}>
                  <span className="leg-date">{shortDate(l.date)}</span>
                  <span className="leg-mode" aria-hidden="true">{LEG_META[l.mode].glyph}</span>
                  <span className="leg-route">
                    {l.from} → {l.to}<small>{LEG_META[l.mode].label}</small>
                  </span>
                </div>
              ))}
            </div>
            {overview.transportNotes.length > 0 && (
              <div className="dash-top" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, paddingTop: 10, fontSize: 12.5 }}>
                {overview.transportNotes.map((n) => {
                  const [mark, ...rest] = n.split('｜');
                  return (
                    <div key={n} style={{ display: 'flex', gap: 8 }}>
                      <span style={{ flex: 'none' }}>{rest.length ? mark : '・'}</span>
                      <span style={{ color: 'var(--brown-dk)' }}>{rest.length ? rest.join('｜') : mark}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 快速前往 */}
          <div className="ov-quick ov-float ov-tilt ov-tilt--d" style={{ border: '1px solid var(--line)' }}>
            {quick.map((q) => (
              <button key={q.label} className="btn-plain card-tap" onClick={() => { location.hash = q.hash; }}>
                <span className="serif" style={{ fontSize: 22, fontWeight: 800, color: 'var(--red)' }}>{q.count}</span>
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em' }}>{q.label}</span>
                <span style={{ fontSize: 10, color: 'var(--brown)' }}>{q.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 下方：待辦、預訂與收藏 */}
      <div className="ov-bottom">
        <div className="card ov-float ov-tilt ov-tilt--e">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div className="serif" style={{ fontSize: 18, fontWeight: 700 }}>出發前待辦</div>
            <div style={{ fontSize: 12, color: 'var(--brown)' }}>{done} / {todos.length} 完成</div>
            {!addTodo.open && <AddButton label="待辦" onClick={addTodo.start} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
            {todos.map((t) => {
              const on = !!todosState[t.key];
              return (
                <button key={t.key} className="btn-plain dash-bottom"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', opacity: canEdit ? 1 : 0.6 }}
                  onClick={() => (canEdit ? toggleTodo(t.key) : openLogin())}>
                  <span style={{
                    flex: 'none', width: 20, height: 20, borderRadius: 4,
                    border: `1.6px solid ${on ? 'var(--green)' : 'rgba(34,32,28,.4)'}`,
                    background: on ? 'var(--green)' : 'transparent', color: '#F8F5EE',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
                  }}>{on ? '✓' : ''}</span>
                  <span style={{ fontSize: 13.5, color: on ? 'var(--brown)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}>{t.text}</span>
                </button>
              );
            })}
          </div>
          <AddedNotice names={addTodo.added} />
          {addTodo.open && <AddTodo onCancel={addTodo.cancel} onAdded={addTodo.done} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 預訂狀態 */}
          {overview.bookings.length > 0 && (
            <div className="card ov-float ov-tilt ov-tilt--b" style={{ padding: '16px 18px' }}>
              <div className="ov-card-head">
                <span className="label-en" style={{ fontSize: 10.5, letterSpacing: '.2em' }}>BUCHUNG</span>
                <span className="ov-card-title">預訂</span>
                <span style={{ fontSize: 12, color: 'var(--brown)' }}>
                  {overview.bookings.filter((b) => b.done).length} / {overview.bookings.length} 已訂
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
                {overview.bookings.map((b) => (
                  <div key={b.item} className="dash-bottom" style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '9px 0' }}>
                    <span className={`badge ${b.done ? 'badge--done' : 'badge--todo'}`}>{b.done ? '✓ ' : ''}{b.status || '待訂'}</span>
                    <span style={{ flex: 'none', fontSize: 13.5, fontWeight: 700 }}>{b.item}</span>
                    <span style={{ fontSize: 12, color: 'var(--brown-dk)', minWidth: 0 }}>{b.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 已標記（點擊展開想去清單） */}
          <button className="banner-dark btn-plain ov-tilt ov-tilt--d" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', cursor: 'pointer', textAlign: 'left', width: '100%' }}
            onClick={() => setWishOpen((o) => !o)}>
            <div className="serif" style={{ writingMode: 'vertical-rl', fontSize: 14, fontWeight: 700, letterSpacing: '.3em', borderRight: '1px solid rgba(244,240,231,.3)', paddingRight: 10 }}>已標記</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="serif" style={{ fontSize: 38, fontWeight: 800, color: 'var(--gold)' }}>{favCount}</span>
              <span style={{ fontSize: 13 }}>個想去的地方</span>
            </div>
            <div style={{ flex: 1, fontSize: 12, color: 'rgba(244,240,231,.72)', minWidth: 140 }}>
              在美食庫、景點與購物頁按 ♡ 標記，地圖頁會依城市統計。
            </div>
            <span style={{ fontSize: 12, color: 'var(--gold)', whiteSpace: 'nowrap' }}>{wishOpen ? '▲ 收合' : '▼ 展開清單'}</span>
          </button>

          <GuideFavCard />
          {wishOpen && <WishList items={favEntities} />}
        </div>
      </div>
    </div>
  );
}
