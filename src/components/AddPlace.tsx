import { useRef, useState, type FormEvent } from 'react';
import { AREAS, CITIES, cityOfArea } from '../data/areas';
import type { Entity, ImageRef } from '../data/schema';
import { addEntity, updateEntity, uploadImage, type AddableCategory, type EntityUpdate } from '../api/add';
import { uploadAll } from '../lib/image-file';
import { entityImages } from '../lib/images';
import { AddFormFooter } from './AddFlow';
import ImagePicker, { type PickedImage } from './ImagePicker';

const MAX_IMAGES = 10;

const HINT: Record<AddableCategory, { name: string; type: string; address: string }> = {
  餐廳: { name: '例：Figlmüller', type: '咖啡廳、維也納菜、啤酒館…', address: '例：Wollzeile 5, 1010 Wien' },
  景點: { name: '例：霍夫堡 Hofburg', type: '宮殿、博物館、觀景台…', address: '例：Michaelerkuppel, 1010 Wien' },
  購物: { name: '例：Manner 史蒂芬廣場店', type: '伴手禮、市集、百貨…', address: '例：Stephansplatz 7, 1010 Wien' },
};

/** vault 裡「-」代表沒填 */
const field = (e: Entity | undefined, key: string) => {
  const v = e?.fields[key]?.trim() ?? '';
  return v === '-' ? '' : v;
};

/** 新增或編輯餐廳／景點／購物。
    新增：送到 Worker 在 vault 建一個新檔。編輯（edit）：表單先帶入原本的內容，送出時只送動過的欄位，
    Worker 只改那幾處（vault 裡手寫的其他段落照舊）。兩種都要等網站重建後才看得到。 */
export default function AddPlace({ category, edit, onCancel, onAdded }: {
  category: AddableCategory;
  /** 要編輯的那筆；不給就是新增 */
  edit?: Entity;
  onCancel: () => void;
  onAdded: (name: string) => void;
}) {
  const initial = {
    name: edit?.name ?? '',
    type: field(edit, '類型'),
    area: edit && AREAS.some((a) => a.name === edit.area) ? edit.area : '',
    address: field(edit, '地址'),
    ticket: field(edit, '門票'),
    price: field(edit, '價位'),
    summary: edit?.summary ?? '',
  };
  const [name, setName] = useState(initial.name);
  const [type, setType] = useState(initial.type);
  const [area, setArea] = useState(initial.area);
  const [address, setAddress] = useState(initial.address);
  const [ticket, setTicket] = useState(initial.ticket);
  const [price, setPrice] = useState(initial.price);
  const [summary, setSummary] = useState(initial.summary);
  const [kept, setKept] = useState<ImageRef[]>(() => (edit ? entityImages(edit) : []));
  const [images, setImages] = useState<PickedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState<string>();
  const uploaded = useRef(new Map<number, string>());
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const verb = edit ? '儲存' : '新增';
  // 景點填門票、餐廳填價位，購物兩個都沒有
  const extra = category === '景點' ? { label: '門票', value: ticket, set: setTicket, hint: '例：成人 €19，建議先預約' }
    : category === '餐廳' ? { label: '價位', value: price, set: setPrice, hint: '例：€20–30／人' }
    : null;

  /** 只送動過的欄位 */
  const changes = (): EntityUpdate['changes'] => {
    const c: EntityUpdate['changes'] = {};
    const now = { name: name.trim(), type: type.trim(), address: address.trim(), ticket: ticket.trim(), price: price.trim(), summary: summary.trim() };
    for (const k of ['name', 'type', 'address', 'summary'] as const) if (now[k] !== initial[k]) c[k] = now[k];
    if (category === '景點' && now.ticket !== initial.ticket) c.ticket = now.ticket;
    if (category === '餐廳' && now.price !== initial.price) c.price = now.price;
    if (area !== initial.area) Object.assign(c, place(area));
    return c;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const title = name.trim();
    if (!title) { setError('請填名稱'); nameRef.current?.focus(); return; }
    const keptFiles = new Set(kept.map((i) => i.file));
    const removed = edit ? entityImages(edit).filter((i) => !keptFiles.has(i.file)).map((i) => i.file) : [];
    const diff = edit ? changes() : {};
    if (edit && Object.keys(diff).length === 0 && removed.length === 0 && images.length === 0) {
      setError('沒有任何修改'); return;
    }
    setBusy(true); setError(null);
    try {
      // 照片先一張張傳進 vault，拿到檔名再建地點／存修改
      const files = await uploadAll(images, uploadImage, uploaded.current, (i) => setBusyText(`上傳照片 ${i + 1}/${images.length}…`));
      setBusyText(`${verb}中…`);
      if (edit) {
        await updateEntity({ id: edit.id, changes: diff, removeImages: removed, addImages: files });
      } else {
        await addEntity({
          category, name: title, type, ...place(area), address,
          ticket: category === '景點' ? ticket : '', price: category === '餐廳' ? price : '', summary, images: files,
        });
      }
      onAdded(title);
    } catch (err) {
      setError(err instanceof Error ? err.message : `${verb}失敗`);
      setBusy(false);
    }
  };

  return (
    <form className={edit ? 'add-form add-form--edit' : 'card add-form'} onSubmit={onSubmit} aria-label={`${edit ? '編輯' : '新增'}${category}`}>
      <label className="add-form-wide">
        名稱（必填）
        <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} disabled={busy}
          placeholder={HINT[category].name} autoFocus={!edit} />
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
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} disabled={busy} rows={edit ? 3 : 2}
          placeholder="一兩句話，會顯示在卡片上" />
      </label>
      <div className="add-form-wide add-form-field">
        <span>照片（最多 {MAX_IMAGES} 張，第一張當卡片封面）</span>
        <ImagePicker images={images} onChange={setImages} max={MAX_IMAGES} disabled={busy}
          existing={kept} onRemoveExisting={(file) => setKept((k) => k.filter((i) => i.file !== file))} />
      </div>
      <AddFormFooter error={error} busy={busy} busyText={busyText} submitLabel={edit ? '儲存' : `新增${category}`} onCancel={onCancel}
        note={edit ? '存回 vault，網站重建後（約 1–2 分鐘）就會更新' : undefined} />
    </form>
  );
}

/** 位置欄寫「城市 / 區域」，建置時靠它把地點歸到城市篩選裡；選市區只寫城市名。 */
function place(area: string): { city: string; location: string } {
  const a = AREAS.find((x) => x.name === area);
  const city = a ? cityOfArea(a.name)?.name ?? '' : '';
  return { city, location: a ? (a.isCity ? city : `${city} / ${a.name}`) : '' };
}
