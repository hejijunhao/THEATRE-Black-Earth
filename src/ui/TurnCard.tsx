// Letterboxed turn-transition title card (v2-vision §7.2):
// "TURN 14 · APRIL · MUD" — the Paradox month-tick feel, briefly.

import { useEffect, useRef, useState } from 'react';
import { WEATHER_DEFS } from '../game/data/defs';
import { formatTurnDate } from '../game/rules/weather';
import { useStore } from '../game/state/store';

export function TurnCard() {
  const game = useStore((s) => s.game);
  const [shown, setShown] = useState<number | null>(null);
  const lastTurn = useRef<number>(0);

  useEffect(() => {
    if (!game) return;
    if (game.turn !== lastTurn.current && game.phase === 'player') {
      lastTurn.current = game.turn;
      if (game.turn > 1) {
        setShown(game.turn);
        const t = setTimeout(() => setShown(null), 2150);
        return () => clearTimeout(t);
      }
    }
  }, [game?.turn, game?.phase, game]);

  if (!game || shown === null) return null;

  return (
    <div className="turn-card" key={shown}>
      <div className="tc-inner">
        <div className="tc-turn">TURN {shown}</div>
        <div className="tc-sub">
          {formatTurnDate(game)} · {WEATHER_DEFS[game.weather].label}
        </div>
      </div>
    </div>
  );
}
