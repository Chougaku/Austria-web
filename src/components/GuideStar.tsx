import { useState } from 'react';
import { useAuth } from '../state/auth';
import { useTripState } from '../state/store';

export default function GuideStar({ guideId }: { guideId: string }) {
  const { isGuideFav, toggleGuideFav } = useTripState();
  const { canEdit, openLogin } = useAuth();
  const [pop, setPop] = useState(false);
  const on = isGuideFav(guideId);
  return (
    <button className={`heart${on ? ' heart--on' : ''}${pop ? ' heart--pop' : ''}`} aria-label="典藏"
      style={canEdit ? undefined : { opacity: 0.4 }}
      onAnimationEnd={() => setPop(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (canEdit) { toggleGuideFav(guideId); setPop(true); } else openLogin();
      }}>
      {on ? '★' : '☆'}
    </button>
  );
}
