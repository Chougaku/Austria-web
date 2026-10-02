import { useState } from 'react';
import { useAuth } from '../state/auth';
import { useTripState } from '../state/store';

export default function Heart({ entityId }: { entityId: string }) {
  const { isFav, toggleFav } = useTripState();
  const { canEdit, openLogin } = useAuth();
  const [pop, setPop] = useState(false);
  const on = isFav(entityId);
  return (
    <button className={`heart${on ? ' heart--on' : ''}${pop ? ' heart--pop' : ''}`} aria-label="收藏"
      style={canEdit ? undefined : { opacity: 0.4 }}
      onAnimationEnd={() => setPop(false)}
      onClick={() => { if (canEdit) { toggleFav(entityId); setPop(true); } else openLogin(); }}>
      {on ? '♥' : '♡'}
    </button>
  );
}
