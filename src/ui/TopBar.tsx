// One thin strip: week / weather / resources. Theatre clock, journal and
// the dossier wait for a click. End Week and staff ops live here so the
// command bench can leave the table when nothing is selected.

import { useState } from 'react';
import { OPERATION_DEFS, UNIT_DEFS, WEATHER_DEFS } from '../game/data/defs';
import { canUseOperation } from '../game/rules/ops';
import { useStore } from '../game/state/store';
import { formatTurnDate } from '../game/rules/weather';
import { OperationId } from '../game/types';
import { paperUp } from './hudChrome';
import { Ico } from './icons';
import { theatreBalance } from './theatreBalance';
import { LexiconTip, Tip } from './Tip';

function Delta({ value }: { value: number }) {
  const cls = value > 0 ? '' : value < 0 ? 'neg' : 'zero';
  const label = value > 0 ? `+${value}` : `${value}`;
  return <span className={`delta-chip ${cls}`}>{label}</span>;
}

const OP_ORDER: OperationId[] = [
  'recon_sweep',
  'artillery_prep',
  'close_support',
  'emergency_resupply',
  'rapid_reinforcement',
  'fortify_position',
];

export function TopBar() {
  const game = useStore((s) => s.game);
  const toMenu = useStore((s) => s.toMenu);
  const setShowSettings = useStore((s) => s.setShowSettings);
  const showJournal = useStore((s) => s.showJournal);
  const showDossier = useStore((s) => s.showDossier);
  const showTheatreClock = useStore((s) => s.showTheatreClock);
  const toggleJournal = useStore((s) => s.toggleJournal);
  const toggleDossier = useStore((s) => s.toggleDossier);
  const toggleTheatreClock = useStore((s) => s.toggleTheatreClock);
  const requestEndTurn = useStore((s) => s.requestEndTurn);
  const beginOperation = useStore((s) => s.beginOperation);
  const beginDeploy = useStore((s) => s.beginDeploy);
  const pendingOp = useStore((s) => s.pendingOp);
  const pendingAttackId = useStore((s) => s.pendingAttackId);
  const lastCombat = useStore((s) => s.lastCombat);
  const selectedUnitId = useStore((s) => s.selectedUnitId);
  const selectedTileId = useStore((s) => s.selectedTileId);
  const [showOps, setShowOps] = useState(false);
  const [showReserves, setShowReserves] = useState(false);

  if (!game) return null;

  const f = game.factions[game.playerFaction];
  const weather = WEATHER_DEFS[game.weather];
  const b = theatreBalance(game);
  const playerTurn = game.phase === 'player';
  const paper = paperUp({ pendingAttackId, lastCombat });
  const canInspect = Boolean(selectedUnitId || selectedTileId);

  return (
    <div className="top-bar">
      <div className="brand">THEATRE</div>

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

      <button
        type="button"
        className={`theatre-chip ${b.headline.toLowerCase()}${showTheatreClock ? ' open' : ''}`}
        onClick={toggleTheatreClock}
        aria-expanded={showTheatreClock}
        aria-label={`Theatre: ${b.headline}`}
      >
        <span className="k">Theatre</span>
        <span className="v">{b.headline}</span>
        <span className="chip-dec">{b.cities.decisiveHeld}/{b.cities.decisiveTotal}</span>
      </button>

      <div className="spacer" />

      <button
        type="button"
        className={`menu-btn${showJournal ? ' on' : ''}`}
        onClick={toggleJournal}
        title="Journal · J"
      >
        Journal
      </button>
      <button
        type="button"
        className={`menu-btn${showDossier ? ' on' : ''}`}
        onClick={toggleDossier}
        disabled={!canInspect}
        title="Dossier · I"
      >
        Dossier
      </button>

      {playerTurn && !paper && (
        <>
          <button
            type="button"
            className={`menu-btn${showOps || Boolean(pendingOp) ? ' on' : ''}`}
            onClick={() => { setShowOps(!showOps); setShowReserves(false); }}
            title="Strategic operations"
          >
            Ops
          </button>
          <button
            type="button"
            className={`menu-btn${showReserves ? ' on' : ''}`}
            onClick={() => { setShowReserves(!showReserves); setShowOps(false); }}
            title="Reserve formations"
          >
            Reserves
          </button>
          <LexiconTip id="endWeek" now="Commit the week and hand the initiative to the enemy.">
            <button className="end-turn-btn strip" onClick={requestEndTurn}>
              End Week
            </button>
          </LexiconTip>
        </>
      )}

      <button className="menu-btn" onClick={() => setShowSettings(true)}>Settings</button>
      <button className="menu-btn" onClick={toMenu}>Menu</button>

      {showOps && playerTurn && !paper && (
        <div className="staff-flyout ops">
          <div className="panel-title">
            Strategic Operations
            <span className="sub">CMD {f.command}/{f.commandMax}</span>
          </div>
          <div style={{ padding: 10 }}>
            {OP_ORDER.map((opId) => {
              const opDef = OPERATION_DEFS[opId];
              const check = canUseOperation(game, game.playerFaction, opId);
              return (
                <Tip key={opId} title={opDef.name} text={opDef.description} block lexicon>
                  <button
                    className="option-btn op-row"
                    disabled={!check.ok}
                    style={!check.ok ? { opacity: 0.45 } : undefined}
                    onClick={() => {
                      beginOperation(opId);
                      setShowOps(false);
                    }}
                  >
                    <span className="op-ico"><Ico name={opId} size={16} /></span>
                    <span className="op-copy">
                      <span className="label">{opDef.name}</span>
                      <span className="desc">
                        {opDef.cost[game.playerFaction]} CMD · cooldown {opDef.cooldown}t
                        {!check.ok && check.reason ? ` — ${check.reason}` : ''}
                      </span>
                    </span>
                  </button>
                </Tip>
              );
            })}
          </div>
        </div>
      )}

      {showReserves && playerTurn && !paper && (
        <div className="staff-flyout reserves">
          <div className="panel-title">Reserve Formations</div>
          <div style={{ padding: 10 }}>
            {f.reserves.length === 0 && (
              <p className="hint">No reserves available. Events may provide new formations.</p>
            )}
            {f.reserves.map((r) => (
              <button
                key={r.id}
                className="option-btn"
                onClick={() => {
                  beginDeploy(r.id);
                  setShowReserves(false);
                }}
              >
                <span className="label">{r.name}</span>
                <span className="desc">
                  {UNIT_DEFS[r.type].label} · strength {r.strength} · deploy: 15 MP, 10 EQ
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
