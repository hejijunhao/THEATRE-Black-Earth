// Vic3-thin play header: faction mark, one week/weather chip, icon+number
// resources, staff icons, settings right. No product wordmark banner.
// Staff verbs stay here so the bench can leave the table at rest.

import { useState } from 'react';
import { OPERATION_DEFS, UNIT_DEFS } from '../game/data/defs';
import { canUseOperation } from '../game/rules/ops';
import { useStore } from '../game/state/store';
import { OperationId } from '../game/types';
import { paperUp } from './hudChrome';
import { Ico } from './icons';
import {
  factionMark,
  resourceChipNow,
  resourceChips,
  weekChipNow,
  weekWeatherChip,
} from './playHeader';
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
  const mark = factionMark(game.playerFaction);
  const week = weekWeatherChip(game);
  const stocks = resourceChips(game);
  const b = theatreBalance(game);
  const playerTurn = game.phase === 'player';
  const paper = paperUp({ pendingAttackId, lastCombat });
  const canInspect = Boolean(selectedUnitId || selectedTileId);

  const shutStaff = () => closeStaff(setShowOps, setShowReserves, setShowDepot);
  const toggleDepot = () => {
    setShowDepot(!showDepot);
    setShowOps(false);
    setShowReserves(false);
  };

  return (
    <div className="top-bar vic3-thin">
      <button
        type="button"
        className={`hdr-chip hdr-faction ${mark.code}${showTheatreClock ? ' open' : ''}`}
        onClick={() => {
          shutStaff();
          toggleTheatreClock();
        }}
        aria-expanded={showTheatreClock}
        aria-label={`${mark.name}. Theatre: ${b.headline}`}
      >
        <span className={`faction-mark ${mark.code}`} aria-hidden />
        <span className="faction-code">{mark.code}</span>
        <span className="pulse-beads" aria-hidden>
          {b.decisiveCities.map((c) => (
            <i key={c.id} className={c.held ? 'held' : 'lost'} title={c.name} />
          ))}
        </span>
      </button>

      <LexiconTip id="weather" now={weekChipNow(week)}>
        <div className="hdr-chip week-chip">
          <Ico name={week.weatherId} size={12} />
          <span className="week-num">W{week.week}</span>
          <span className="week-wx">{week.weatherLabel}</span>
        </div>
      </LexiconTip>

      <div className="hdr-resources">
        {stocks.map((chip) => (
          <LexiconTip key={chip.id} id={chip.id} now={resourceChipNow(chip)}>
            <button
              type="button"
              className={`hdr-chip res-chip${showDepot ? ' open' : ''}`}
              onClick={toggleDepot}
              aria-expanded={showDepot}
              aria-label={`${chip.id} ${chip.id === 'command' && chip.cap != null ? `${chip.value}/${chip.cap}` : chip.value}`}
            >
              <Ico name={chip.icon} size={12} />
              <span className="res-val">
                {chip.id === 'command' && chip.cap != null ? `${chip.value}/${chip.cap}` : chip.value}
              </span>
            </button>
          </LexiconTip>
        ))}
      </div>

      <div className="spacer" />

      <button
        type="button"
        className={`hdr-ico${showJournal ? ' on' : ''}`}
        onClick={toggleJournal}
        title="Journal · J"
        aria-label="Journal"
      >
        <Ico name="journal" size={13} />
      </button>
      <button
        type="button"
        className={`hdr-ico${showDossier ? ' on' : ''}`}
        onClick={toggleDossier}
        disabled={!canInspect}
        title="Dossier · I"
        aria-label="Dossier"
      >
        <Ico name="dossier" size={13} />
      </button>

      {playerTurn && !paper && (
        <>
          <button
            type="button"
            className={`hdr-ico${showOps || Boolean(pendingOp) ? ' on' : ''}`}
            onClick={() => {
              setShowOps(!showOps);
              setShowReserves(false);
              setShowDepot(false);
            }}
            title="Strategic operations"
            aria-label="Operations"
          >
            <Ico name="operations" size={13} />
          </button>
          <button
            type="button"
            className={`hdr-ico${showReserves ? ' on' : ''}`}
            onClick={() => {
              setShowReserves(!showReserves);
              setShowOps(false);
              setShowDepot(false);
            }}
            title="Reserve formations"
            aria-label="Reserves"
          >
            <Ico name="reserves" size={13} />
          </button>
          <LexiconTip id="endWeek" now="Commit the week and hand the initiative to the enemy.">
            <button type="button" className="hdr-chip end-chip" onClick={requestEndTurn}>
              <Ico name="turn" size={12} />
              <span>End</span>
            </button>
          </LexiconTip>
        </>
      )}

      <button
        type="button"
        className="hdr-ico hdr-settings"
        onClick={() => setShowSettings(true)}
        title="Settings"
        aria-label="Settings"
      >
        <Ico name="settings" size={13} />
      </button>
      <button
        type="button"
        className="hdr-ico hdr-menu"
        onClick={toMenu}
        title="Menu"
        aria-label="Menu"
      >
        <Ico name="menu" size={13} />
      </button>

      {showDepot && (
        <div className="staff-flyout depot">
          <div className="panel-title">
            Depot
            <span className="sub">next week</span>
          </div>
          <div className="depot-rows">
            {stocks.map((chip) => (
              <LexiconTip key={chip.id} id={chip.id} now={resourceChipNow(chip)}>
                <div className="depot-row">
                  <Ico name={chip.icon} size={14} />
                  <span className="k">{chip.id === 'manpower' ? 'Manpower' : chip.id === 'equipment' ? 'Equipment' : 'Command'}</span>
                  <span className="v">
                    {chip.id === 'command' && chip.cap != null ? `${chip.value}/${chip.cap}` : chip.value}
                  </span>
                  <span className="inc">+{chip.income}</span>
                </div>
              </LexiconTip>
            ))}
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
