import { useState } from 'react';
import type { Entity } from '../data/schema';
import { imagesIn, withoutImages } from '../lib/images';
import EntityActions from './EntityActions';
import Gallery from './Gallery';
import MapLink from './MapLink';
import MarkdownBody from './MarkdownBody';
import Modal from './Modal';
import PhotoViewer from './PhotoViewer';

/** 點餐廳／景點／購物卡片打開的詳細頁：上面是可以左右滑的照片（點了全螢幕看），下面是 vault 裡的完整內容。
    手機上是從下面滑上來的一張單子。 */
export default function EntityDetail({ entity, start = 0, onClose }: {
  entity: Entity;
  /** 從封面第幾張點進來的 */
  start?: number;
  onClose: () => void;
}) {
  const photos = imagesIn(entity.body);
  const [viewing, setViewing] = useState<number | null>(null);
  const body = withoutImages(entity.body);
  const type = entity.fields['類型'];

  return (
    <Modal label={entity.name} onClose={onClose} className="modal--detail">
      {photos.length > 0 && <Gallery urls={photos} alt={entity.name} start={start} onPick={setViewing} />}
      <div className="detail-body">
        <div className="detail-head">
          <h2 className="serif detail-title">{entity.name}</h2>
          <EntityActions entity={entity} onDeleted={onClose} />
        </div>
        <div className="detail-meta">
          <span className="detail-badge">{entity.category}</span>
          {type && type !== '-' && <span className="detail-badge detail-badge--soft">{type}</span>}
          {entity.rating != null && <span className="detail-rating">★ {entity.rating.toFixed(1)}</span>}
          {entity.area && <span className="detail-area">{entity.area}</span>}
          <MapLink name={entity.name} area={entity.area} />
        </div>
        {body ? <MarkdownBody>{body}</MarkdownBody> : <p className="detail-empty">還沒有更多內容。</p>}
      </div>
      {viewing !== null && <PhotoViewer urls={photos} alt={entity.name} start={viewing} onClose={() => setViewing(null)} />}
    </Modal>
  );
}
