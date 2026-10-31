import type { Entity } from '../data/schema';
import { deleteItem } from '../api/add';
import { deletedKey, markDeleted } from '../lib/deleted';
import Heart from './Heart';
import DeleteButton from './DeleteButton';

/** 餐廳／景點／購物卡片右上角：收藏，登入後多一個刪除。 */
export default function EntityActions({ entity, onDeleted }: { entity: Pick<Entity, 'id' | 'name'>; onDeleted?: () => void }) {
  return (
    <div className="card-actions">
      <Heart entityId={entity.id} />
      <DeleteButton
        name={entity.name}
        confirmText={`確定刪除「${entity.name}」？\n會連同它的照片從 vault 刪掉，網站重建後就不見了。`}
        onDelete={async () => {
          await deleteItem({ kind: 'entity', id: entity.id });
          markDeleted(deletedKey.entity(entity.id));
          onDeleted?.();
        }}
      />
    </div>
  );
}
