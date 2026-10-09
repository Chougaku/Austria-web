import { useRef, useState, type FormEvent } from 'react';
import { AREAS, CITIES, cityOfArea } from '../data/areas';
import { addEntity, type AddableCategory } from '../api/entity';

const TYPE_HINT: Record<AddableCategory, string> = {
  景點: '宮殿、博物館、觀景台…',
  購物: '伴手禮、市集、百貨…',
};

/** 登入後新增景點／購物：送到 Worker 在 vault 建一個新檔，網站重建後才會出現在列表裡。 */
export default function AddPlace({ category, onCancel, onAdded }: {
  category: AddableCategory;
  onCancel: () => void;
  onAdded: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [ticket, setTicket] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const title = name.trim();
    if (!title) { setError('請填名稱'); nameRef.current?.focus(); return; }
    // 位置欄寫「城市 / 區域」，建置時靠它把地點歸到城市篩選裡
    const a = AREAS.find((x) => x.name === area);
    const city = a ? cityOfArea(a.name)?.name ?? '' : '';
    const location = a ? (a.isCity ? city : `${city} / ${a.name}`) : '';
    setBusy(true); setError(null);
    try {
      await addEntity({ category, name: title, type, city, location, address, ticket: category === '景點' ? ticket : '', summary });
      onAdded(title);
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增失敗');
      setBusy(false);
    }
  };

  return (
    <form className="card add-form" onSubmit={onSubmit} aria-label={`新增${category}`}>
      <label className="add-form-wide">
        名稱（必填）
        <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} disabled={busy}
          placeholder={category === '景點' ? '例：霍夫堡 Hofburg' : '例：Manner 史蒂芬廣場店'} autoFocus />
      </label>
      <label>
        類型
        <input value={type} onChange={(e) => setType(e.target.value)} disabled={busy} placeholder={TYPE_HINT[category]} />
      </label>
      <label>
        區域
        <select value={area} onChange={(e) => setArea(e.target.value)} disabled={busy}>
          <option value="">未指定</option>
          {CITIES.map((c) => (
            <optgroup key={c.key} label={c.name}>
              {AREAS.filter((a) => a.city === c.key).map((a) => (
                <option key={a.name} value={a.name}>{a.isCity ? `${a.name}（市區）` : a.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className={category === '景點' ? undefined : 'add-form-wide'}>
        地址
        <input value={address} onChange={(e) => setAddress(e.target.value)} disabled={busy} placeholder="例：Michaelerkuppel, 1010 Wien" />
      </label>
      {category === '景點' && (
        <label>
          門票
          <input value={ticket} onChange={(e) => setTicket(e.target.value)} disabled={busy} placeholder="例：成人 €19，建議先預約" />
        </label>
      )}
      <label className="add-form-wide">
        簡介
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} disabled={busy} rows={2}
          placeholder="一兩句話，會顯示在卡片上" />
      </label>
      {error && (
        <div role="alert" className="plan-msg plan-msg--err add-form-wide" style={{ marginTop: 0 }}>
          <span className="plan-msg-mark" aria-hidden="true">！</span>{error}
        </div>
      )}
      <div className="add-form-actions">
        <span className="add-form-note">存進 vault，網站重建後（約 1–2 分鐘）就會出現</span>
        <button type="button" className="btn-plain add-form-btn" onClick={onCancel} disabled={busy}>取消</button>
        <button type="submit" className="btn-plain add-form-btn add-form-btn--primary" disabled={busy}>
          {busy ? '新增中…' : `新增${category}`}
        </button>
      </div>
    </form>
  );
}
