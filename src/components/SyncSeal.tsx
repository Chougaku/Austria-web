import { useTripState } from '../state/store';

/** 同步中的郵戳 loader：非同步中不渲染。 */
export default function SyncSeal() {
  const { syncing } = useTripState();
  if (!syncing) return null;
  return <span className="seal-loader serif" role="status" aria-label="同步中">郵</span>;
}
