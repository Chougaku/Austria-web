import { useRef, useState, type FormEvent } from 'react';
import { AREAS, CITIES, cityOfArea } from '../data/areas';
import { addEntity, type AddableCategory } from '../api/add';
import { AddFormFooter } from './AddFlow';

const HINT: Record<AddableCategory, { name: string; type: string; address: string }> = {
  餐廳: { name: '例：Figlmüller', type: '咖啡廳、維也納菜、啤酒館…', address: '例：Wollzeile 5, 1010 Wien' },
  景點: { name: '例：霍夫堡 Hofburg', type: '宮殿、博物館、觀景台…', address: '例：Michaelerkuppel, 1010 Wien' },
  購物: { name: '例：Manner 史蒂芬廣場店', type: '伴手禮、市集、百貨…', address: '例：Stephansplatz 7, 1010 Wien' },
};

/** 登入後新增餐廳／景點／購物：送到 Worker 在 vault 建一個新檔，網站重建後才會出現在列表裡。 */
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
  const [price, setPrice] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  // 景點填門票、餐廳填價位，購物兩個都沒有
  const extra = category === '景點' ? { label: '門票', value: ticket, set: setTicket, hint: '例：成人 €19，建議先預約' }
    : category === '餐廳' ? { label: '價位', value: price, set: setPrice, hint: '例：€20–30／人' }
    : null;

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
      await addEntity({
        category, name: title, type, city, location, address,
        ticket: category === '景點' ? ticket : '', price: category === '餐廳' ? price : '', summary,
      });
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
          placeholder={HINT[category].name} autoFocus />
      </label>
      <label>
        類型
        <input value={type} onChange={(e) => setType(e.target.value)} disabled={busy} placeholder={HINT[category].type} />
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
      <label className={extra ? undefined : 'add-form-wide'}>
        地址
        <input value={address} onChange={(e) => setAddress(e.target.value)} disabled={busy} placeholder={HINT[category].address} />
      </label>
      {extra && (
        <label>
          {extra.label}
          <input value={extra.value} onChange={(e) => extra.set(e.target.value)} disabled={busy} placeholder={extra.hint} />
        </label>
      )}
      <label className="add-form-wide">
        簡介
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} disabled={busy} rows={2}
          placeholder="一兩句話，會顯示在卡片上" />
      </label>
      <AddFormFooter error={error} busy={busy} submitLabel={`新增${category}`} onCancel={onCancel} />
    </form>
  );
}
