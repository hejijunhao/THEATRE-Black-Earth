// Top strip: turn, date, weather, faction resources, war support, score.

import { WEATHER_DEFS } from '../game/data/defs';
import { useStore } from '../game/state/store';
import { formatTurnDate } from '../game/rules/weather';
import { heldVP } from '../game/rules/victory';
import { opposing } from '../game/types';
import { Tip } from './Tip';

export function TopBar() {
  const game = useStore((s) => s.game);
  const toMenu = useStore((s) => s.toMenu);
  const setShowSettings = useStore((s) => s.setShowSettings);
  if (!game) return null;

  const f = game.factions[game.playerFaction];
  const enemy = game.factions[opposing(game.playerFaction)];
  const vp = heldVP(game, game.playerFaction);

  const wsClass = f.warSupport < 25 ? 'bad' : f.warSupport < 45 ? 'warn' : '';

  return (
    <div className="top-bar">
      <div className="brand">THEATRE · BLACK EARTH</div>

      <Tip
        title="Turn and date"
        text={`Each turn represents roughly one week. The campaign is adjudicated after turn ${game.scenario.maxTurns}. Scenario: ${game.scenario.dateLabel}.`}
      >
        <div className="cell">
          <span className="k">Turn</span>
          <span className="v">{game.turn}/{game.scenario.maxTurns}</span>
          <span className="v" style={{ color: 'var(--ink-dim)' }}>{formatTurnDate(game)}</span>
        </div>
      </Tip>

      <Tip
        title={`Weather — ${WEATHER_DEFS[game.weather].label}`}
        text="Weather affects movement, attack effectiveness, reconnaissance and readiness recovery. Mud and snow slow everything off the roads."
      >
        <div className="cell">
          <span className="k">Wx</span>
          <span className="v">{WEATHER_DEFS[game.weather].label}</span>
        </div>
      </Tip>

      <Tip
        title="Faction"
        text={`You command the ${f.name} side in this designed scenario.`}
      >
        <div className="cell">
          <span className={`faction-chip ${f.id}`} />
          <span className="v">{f.name}</span>
        </div>
      </Tip>

      <Tip
        title="Manpower"
        text="Used to restore formation strength and deploy reserves. Gained slowly each turn. If it runs out, damaged formations cannot be rebuilt."
      >
        <div className="cell">
          <span className="k">MP</span>
          <span className="v">{Math.floor(f.manpower)}</span>
        </div>
      </Tip>

      <Tip
        title="Equipment"
        text="Vehicles, weapons and matériel. Consumed by reinforcement, especially for mechanised and armoured formations."
      >
        <div className="cell">
          <span className="k">EQ</span>
          <span className="v">{Math.floor(f.equipment)}</span>
        </div>
      </Tip>

      <Tip
        title="Command points"
        text={`Fuel for strategic operations. Regenerates ${f.commandRegen} per turn up to ${f.commandMax}.`}
      >
        <div className="cell">
          <span className="k">CMD</span>
          <span className="v">{f.command}/{f.commandMax}</span>
        </div>
      </Tip>

      <Tip
        title="War support"
        text="National cohesion. Falls with heavy losses and lost cities; rises with successes. If it collapses, the campaign is lost — the enemy's can collapse too."
      >
        <div className="cell">
          <span className="k">Support</span>
          <span className={`v ${wsClass}`}>{Math.round(f.warSupport)}%</span>
          <span className="v" style={{ color: 'var(--ink-dim)', fontSize: 11 }}>
            (foe {Math.round(enemy.warSupport)}%)
          </span>
        </div>
      </Tip>

      <Tip
        title="Campaign score"
        text="Accumulates from territorial gains relative to the start, captured objectives and destroyed enemy formations. Decides the outcome at the turn limit."
      >
        <div className="cell">
          <span className="k">Score</span>
          <span className="v">{f.score}</span>
          <span className="v" style={{ color: 'var(--ink-dim)', fontSize: 11 }}>vs {enemy.score}</span>
        </div>
      </Tip>

      <Tip title="Victory points held" text="Total victory-point value of cities currently under your control.">
        <div className="cell">
          <span className="k">VP</span>
          <span className="v">{vp}</span>
        </div>
      </Tip>

      <div className="spacer" />
      <button className="menu-btn" onClick={() => setShowSettings(true)}>Settings</button>
      <button className="menu-btn" onClick={toMenu}>Menu</button>
    </div>
  );
}
