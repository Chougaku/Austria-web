import { useState } from 'react';
import type { Entity } from '../data/schema';
import type { AddableCategory } from '../api/add';
import { entityImages, withoutImages } from '../lib/images';
import { useAuth } from '../state/auth';
import AddPlace from './AddPlace';
import EntityActions from './EntityActions';
import Gallery from './Gallery';
import MapLink from './MapLink';
import MarkdownBody from './MarkdownBody';
import Modal from './Modal';
import PhotoViewer from './PhotoViewer';

/** 點餐廳／景點／購物卡片打開的詳細頁：上面是可以左右滑的照片（點了全螢幕看），下面是 vault 裡的完整內容。
    登入後可以按「編輯」直接在這裡改（名稱、類型、區域、地址、門票／價位、簡介、照片）。手機上是從下面滑上來的一張單子。 */
export default function EntityDetail({ entity, start = 0, onClose }: {
  entity: Entity;
  /** 從封面第幾張點進來的 */
  start?: number;
  onClose: () => void;
}) {
  const { canEdit, openLogin } = useAuth();
  const photos = entityImages(entity).map((i) => i.url);
  const [viewing, setViewing] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const body = withoutImages(entity.body);
  const startEdit = () => {
    if (!canEdit) { openLogin(); return; }
    setSaved(false);
    setEditing(true);
  };
  const type = entity.fields['類型'];

  return (
    <Modal label={entity.name} onClose={onClose} className="modal--detail">
      {!editing && photos.length > 0 && <Gallery urls={photos} alt={entity.name} start={start} onPick={setViewing} />}
      <div className="detail-body">
        {editing ? (
          <>
            <h2 className="serif detail-title detail-title--edit">編輯「{entity.name}」</h2>
            <AddPlace category={entity.category as AddableCategory} edit={entity}
              onCancel={() => setEditing(false)}
              onAdded={() => { setEditing(false); setSaved(true); }} />
          </>
        ) : (
          <>
            <div className="detail-head">
              <h2 className="serif detail-title">{entity.name}</h2>
              <button type="button" className="btn-plain detail-edit"
                onClick={startEdit}>編輯</button>
              <EntityActions entity={entity} onDeleted={onClose} />
            </div>
            {saved && (
              <div role="status" className="plan-msg plan-msg--ok" style={{ marginTop: 10 }}>
                <span className="plan-msg-mark" aria-hidden="true">✓</span>
                已儲存，網站重建後（約 1–2 分鐘）重新整理就會更新
              </div>
            )}
            <div className="detail-meta">
              <span className="detail-badge">{entity.category}</span>
              {type && type !== '-' && <span className="detail-badge detail-badge--soft">{type}</span>}
              {entity.rating != null && <span className="detail-rating">★ {entity.rating.toFixed(1)}</span>}
              {entity.area && <span className="detail-area">{entity.area}</span>}
              <MapLink name={entity.name} area={entity.area} />
            </div>
            {body ? <MarkdownBody>{body}</MarkdownBody> : <p className="detail-empty">還沒有更多內容。</p>}
          </>
        )}
      </div>
      {viewing !== null && <PhotoViewer urls={photos} alt={entity.name} start={viewing} onClose={() => setViewing(null)} />}
    </Modal>
  );
}
