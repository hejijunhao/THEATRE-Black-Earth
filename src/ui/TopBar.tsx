// One thin instrument: week / weather, a theatre pulse, one depot.
// Staff verbs live here so the bench can leave the table at rest.
// Not a SaaS ledger — no Manpower / Equipment / Command delta chips.

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

const OP_ORDER: OperationId[] = [
  'recon_sweep',
  'artillery_prep',
  'close_support',
  'emergency_resupply',
  'rapid_reinforcement',
  'fortify_position',
];

function closeStaff(
  setShowOps: (v: boolean) => void,
  setShowReserves: (v: boolean) => void,
  setShowDepot: (v: boolean) => void,
) {
  setShowOps(false);
  setShowReserves(false);
  setShowDepot(false);
}

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
  const [showDepot, setShowDepot] = useState(false);

  if (!game) return null;

  const f = game.factions[game.playerFaction];
  const weather = WEATHER_DEFS[game.weather];
  const b = theatreBalance(game);
  const playerTurn = game.phase === 'player';
  const paper = paperUp({ pendingAttackId, lastCombat });
  const canInspect = Boolean(selectedUnitId || selectedTileId);
  const phaseLabel = game.phase === 'player' ? 'Your week' : game.phase === 'ai' ? 'Enemy week' : 'Ended';

  const shutStaff = () => closeStaff(setShowOps, setShowReserves, setShowDepot);

  return (
    <div className="top-bar instrument">
      <div className="brand">THEATRE</div>

      <LexiconTip
        id="weather"
        now={`Week ${game.turn} of ${game.scenario.maxTurns} · ${weather.label} · ${formatTurnDate(game)}.`}
      >
        <div className="week-read">
          <span className={`phase-mark ${game.phase}`}>{phaseLabel}</span>
          <span className="week-num">Week {game.turn}</span>
          <span className="week-of">/{game.scenario.maxTurns}</span>
          <span className="week-rule" aria-hidden />
          <span className="week-wx">{weather.label}</span>
          <span className="week-date">{formatTurnDate(game)}</span>
        </div>
      </LexiconTip>

      <button
        type="button"
        className={`theatre-pulse ${b.headline.toLowerCase()}${showTheatreClock ? ' open' : ''}`}
        onClick={() => {
          shutStaff();
          toggleTheatreClock();
        }}
        aria-expanded={showTheatreClock}
        aria-label={`Theatre: ${b.headline}`}
      >
        <span className="pulse-word">{b.headline}</span>
        <span className="pulse-beads" aria-hidden>
          {b.decisiveCities.map((c) => (
            <i key={c.id} className={c.held ? 'held' : 'lost'} title={c.name} />
          ))}
        </span>
      </button>

      <button
        type="button"
        className={`depot-chip${showDepot ? ' open' : ''}`}
        onClick={() => {
          setShowDepot(!showDepot);
          setShowOps(false);
          setShowReserves(false);
        }}
        aria-expanded={showDepot}
        title="Depot — manpower, equipment, command"
      >
        <Ico name="depot" size={13} />
        <span>Depot</span>
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
            onClick={() => {
              setShowOps(!showOps);
              setShowReserves(false);
              setShowDepot(false);
            }}
            title="Strategic operations"
          >
            Ops
          </button>
          <button
            type="button"
            className={`menu-btn${showReserves ? ' on' : ''}`}
            onClick={() => {
              setShowReserves(!showReserves);
              setShowOps(false);
              setShowDepot(false);
            }}
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

      {showDepot && (
        <div className="staff-flyout depot">
          <div className="panel-title">
            Depot
            <span className="sub">next week</span>
          </div>
          <div className="depot-rows">
            <LexiconTip id="manpower" now={`${Math.floor(f.manpower)} in the depot; +${f.manpowerIncome} next week.`}>
              <div className="depot-row">
                <Ico name="manpower" size={14} />
                <span className="k">Manpower</span>
                <span className="v">{Math.floor(f.manpower)}</span>
                <span className="inc">+{f.manpowerIncome}</span>
              </div>
            </LexiconTip>
            <LexiconTip id="equipment" now={`${Math.floor(f.equipment)} in the depot; +${f.equipmentIncome} next week.`}>
              <div className="depot-row">
                <Ico name="equipment" size={14} />
                <span className="k">Equipment</span>
                <span className="v">{Math.floor(f.equipment)}</span>
                <span className="inc">+{f.equipmentIncome}</span>
              </div>
            </LexiconTip>
            <LexiconTip id="command" now={`${f.command} of ${f.commandMax}; regenerates ${f.commandRegen}.`}>
              <div className="depot-row">
                <Ico name="command" size={14} />
                <span className="k">Command</span>
                <span className="v">{f.command}/{f.commandMax}</span>
                <span className="inc">+{f.commandRegen}</span>
              </div>
            </LexiconTip>
          </div>
        </div>
      )}

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
