// Restrained notification feed, bottom-left, above the map-mode cluster.

import { useStore } from '../game/state/store';

export function Notifications() {
  const game = useStore((s) => s.game);
  if (!game) return null;
  const recent = game.notifications.slice(-7);
  return (
    <div className="notifications">
      {[...recent].reverse().map((n) => (
        <div key={n.id} className={`note ${n.kind}`}>
          <span className="t">T{n.turn}</span>
          {n.text}
        </div>
      ))}
    </div>
  );
}
