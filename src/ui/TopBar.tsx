// Top strip as a LEDGER: resources with deltas. Campaign judgement lives
// on the victory clock — not three more cells.

import { WEATHER_DEFS } from '../game/data/defs';
import { useStore } from '../game/state/store';
import { formatTurnDate } from '../game/rules/weather';
import { LexiconTip } from './Tip';

function Delta({ value }: { value: number }) {
  const cls = value > 0 ? '' : value < 0 ? 'neg' : 'zero';
  const label = value > 0 ? `+${value}` : `${value}`;
  return <span className={`delta-chip ${cls}`}>{label}</span>;
}

export function TopBar() {
  const game = useStore((s) => s.game);
  const toMenu = useStore((s) => s.toMenu);
  const setShowSettings = useStore((s) => s.setShowSettings);
  if (!game) return null;

  const f = game.factions[game.playerFaction];
  const weather = WEATHER_DEFS[game.weather];

  return (
    <div className="top-bar">
      <div className="brand">THEATRE · BLACK EARTH</div>

      <LexiconTip
        id="weather"
        now={`Week ${game.turn} of ${game.scenario.maxTurns} · ${weather.label} · ${formatTurnDate(game)}.`}
      >
        <div className="cell">
          <span className={`phase-pill ${game.phase}`}>
            {game.phase === 'player' ? 'Your week' : game.phase === 'ai' ? 'Enemy week' : 'Ended'}
          </span>
          <span className="v">{game.turn}/{game.scenario.maxTurns}</span>
          <span className="v" style={{ color: 'var(--ink-dim)' }}>{weather.label}</span>
        </div>
      </LexiconTip>

      <LexiconTip id="manpower" now={`${Math.floor(f.manpower)} in the depot; +${f.manpowerIncome} next week.`}>
        <div className="cell">
          <span className="k">Manpower</span>
          <span className="v">{Math.floor(f.manpower)}</span>
          <Delta value={f.manpowerIncome} />
        </div>
      </LexiconTip>

      <LexiconTip id="equipment" now={`${Math.floor(f.equipment)} in the depot; +${f.equipmentIncome} next week.`}>
        <div className="cell">
          <span className="k">Equipment</span>
          <span className="v">{Math.floor(f.equipment)}</span>
          <Delta value={f.equipmentIncome} />
        </div>
      </LexiconTip>

      <LexiconTip id="command" now={`${f.command} of ${f.commandMax}; regenerates ${f.commandRegen}.`}>
        <div className="cell">
          <span className="k">Command</span>
          <span className="v">{f.command}/{f.commandMax}</span>
          <Delta value={f.commandRegen} />
        </div>
      </LexiconTip>

      <div className="spacer" />
      <button className="menu-btn" onClick={() => setShowSettings(true)}>Settings</button>
      <button className="menu-btn" onClick={toMenu}>Menu</button>
    </div>
  );
}
