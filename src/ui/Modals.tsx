// Modal dialogs: event decisions, end-turn warnings, combat results,
// settings and the campaign-end screen.

import { SLOT_COUNT, slotHeaders } from '../game/state/save';
import { useStore } from '../game/state/store';
import { opposing } from '../game/types';

export function EventModal() {
  const game = useStore((s) => s.game);
  const chooseEventOption = useStore((s) => s.chooseEventOption);
  if (!game?.pendingEvent || game.phase !== 'player') return null;
  const event = game.pendingEvent;

  return (
    <div className="modal-backdrop">
      <div className="modal panel panel-framed briefing">
        <div className="stamp">Decision</div>
        <div className="panel-title">
          Strategic Briefing
          <span className="sub">Turn {game.turn}</span>
        </div>
        <div className="body">
          <div className="doc-head">
            From: Theatre staff · To: Commander · Subject follows
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--ink-bright)', marginBottom: 6 }}>
            {event.title}
          </p>
          <p>{event.text}</p>
          {event.options.map((opt, i) => (
            <button key={i} className="option-btn" onClick={() => chooseEventOption(i)}>
              <span className="label">{opt.label}</span>
              <span className="desc">{opt.description}</span>
            </button>
          ))}
          <div className="sign-line">— By order of the theatre command</div>
        </div>
      </div>
    </div>
  );
}

export function EndTurnDialog() {
  const warnings = useStore((s) => s.endTurnWarningsList);
  const confirmEndTurn = useStore((s) => s.confirmEndTurn);
  const cancelEndTurn = useStore((s) => s.cancelEndTurn);
  if (!warnings) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal panel" style={{ width: 420 }}>
        <div className="panel-title">Before you end the turn</div>
        <div className="body">
          {warnings.map((w, i) => (
            <p key={i} style={{ color: 'var(--amber)', margin: '0 0 8px' }}>· {w}</p>
          ))}
          <p className="hint">
            Choosing not to act can be correct — but make sure it is a choice.
          </p>
          <div className="btn-row">
            <button className="btn primary" onClick={confirmEndTurn}>End turn anyway</button>
            <button className="btn" onClick={cancelEndTurn}>Review orders</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Die({ value }: { value: number }) {
  return <span className="die" aria-label={`d6 showing ${value}`}>{value}</span>;
}

function RollRow({ label, roll, hint }: { label: string; roll: { dice: number[]; total: number; fortune: number }; hint: string }) {
  return (
    <div className="aar-roll">
      <div className="aar-roll-meta">
        <span className="k">{label}</span>
        <span className="hint">{hint}</span>
      </div>
      <div className="aar-dice">
        {roll.dice.map((d, i) => <Die key={i} value={d} />)}
        <span className="aar-total">= {roll.total}</span>
        <span className={`aar-fortune ${roll.fortune >= 1 ? 'pos' : 'neg'}`}>
          ×{roll.fortune.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export function CombatResultPanel() {
  const game = useStore((s) => s.game);
  const result = useStore((s) => s.lastCombat);
  const dismissCombat = useStore((s) => s.dismissCombat);
  if (!game || !result || game.phase !== 'player') return null;

  const isFire = result.kind === 'bombardment';
  const outcome = result.defenderDestroyed
    ? 'The defending formation was destroyed.'
    : result.defenderRetreated
      ? 'The defenders fell back.'
      : isFire
        ? 'The fires mission landed. Ground is not taken by bombardment.'
        : 'The line held. Repeated pressure may still break it.';
  const outcomeCls = result.defenderDestroyed
    ? 'bad'
    : result.defenderRetreated
      ? 'warn'
      : '';

  return (
    <div className="modal-backdrop aar-backdrop" onClick={dismissCombat}>
      <div
        className="modal panel panel-framed aar"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="aar-title"
      >
        <div className="stamp">{isFire ? 'Fires' : 'After Action'}</div>
        <div className="panel-title" id="aar-title">
          {isFire ? 'Fire Mission' : 'Engagement'}
          <span className="sub">Turn {game.turn}</span>
        </div>
        <div className="body">
          <div className="aar-matchup">
            <div className="aar-side">
              <div className="type">Attacker</div>
              <div className="name">{result.attackerName}</div>
              <div className="aar-str">
                {Math.round(result.attackerStrengthBefore)}%
                <span className="arrow">→</span>
                {Math.round(result.attackerStrengthAfter)}%
              </div>
            </div>
            <div className="aar-odds">
              <div className={`verdict ${result.resolvedVerdict}`}>
                {result.resolvedVerdict}
              </div>
              <div className="aar-odds-n">
                {result.baseRatio >= 1
                  ? `${result.baseRatio.toFixed(1)} : 1`
                  : `1 : ${(1 / Math.max(result.baseRatio, 0.01)).toFixed(1)}`}
                <span className="k"> before dice</span>
              </div>
            </div>
            <div className="aar-side right">
              <div className="type">Defender</div>
              <div className="name">{result.defenderName}</div>
              <div className="aar-str">
                {Math.round(result.defenderStrengthBefore)}%
                <span className="arrow">→</span>
                {Math.round(result.defenderStrengthAfter)}%
              </div>
            </div>
          </div>

          <RollRow
            label={isFire ? 'Fire roll (2d6)' : 'Attack roll (2d6)'}
            roll={result.attackerRoll}
            hint={isFire ? 'Scales effect of the mission' : 'Decides damage given'}
          />
          {result.defenderRoll && (
            <RollRow
              label="Defence roll (2d6)"
              roll={result.defenderRoll}
              hint="Decides damage taken"
            />
          )}

          <div className="aar-exchange">
            <div className="kv-line">
              <span className="k">Damage given</span>
              <span className="v">−{Math.round(result.defenderLoss)} str · −{Math.round(result.defenderReadinessLoss)} rdy · −{Math.round(result.defenderMoraleLoss)} mor</span>
            </div>
            <div className="kv-line">
              <span className="k">Damage taken</span>
              <span className="v">
                {isFire
                  ? '— (fires do not expose the battery)'
                  : `−${Math.round(result.attackerLoss)} str · −${Math.round(result.attackerReadinessLoss)} rdy · −${Math.round(result.attackerMoraleLoss)} mor`}
              </span>
            </div>
          </div>

          <p className={`aar-outcome ${outcomeCls}`}>{outcome}</p>
          {result.tileCaptured && (
            <p className="aar-outcome gold">Ground captured. The attacker advanced.</p>
          )}
          {!isFire && result.previewVerdict !== result.resolvedVerdict && (
            <p className="hint">
              Preview was {result.previewVerdict}; the dice made it {result.resolvedVerdict}.
            </p>
          )}

          <div className="btn-row">
            <button className="btn primary" onClick={dismissCombat}>Continue (Esc)</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsModal() {
  const show = useStore((s) => s.showSettings);
  const setShow = useStore((s) => s.setShowSettings);
  const audio = useStore((s) => s.audio);
  const setAudio = useStore((s) => s.setAudio);
  const aiSpeed = useStore((s) => s.aiSpeed);
  const setAISpeed = useStore((s) => s.setAISpeed);
  const quality = useStore((s) => s.quality);
  const setQuality = useStore((s) => s.setQuality);
  const counterMode = useStore((s) => s.counterMode);
  const toggleCounterMode = useStore((s) => s.toggleCounterMode);
  const game = useStore((s) => s.game);
  const saveToSlot = useStore((s) => s.saveToSlot);
  const loadFromSlot = useStore((s) => s.loadFromSlot);
  if (!show) return null;

  const slots = slotHeaders();

  return (
    <div className="modal-backdrop" onClick={() => setShow(false)}>
      <div className="modal panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-title">Settings</div>
        <div className="body">
          <h3 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-dim)' }}>Sound</h3>
          <div className="slider-row">
            <label>Master</label>
            <input
              type="range" min={0} max={1} step={0.05} value={audio.master}
              onChange={(e) => setAudio({ master: Number(e.target.value) })}
            />
            <span className="val">{Math.round(audio.master * 100)}</span>
          </div>
          <div className="slider-row">
            <label>Ambience</label>
            <input
              type="range" min={0} max={1} step={0.05} value={audio.music}
              onChange={(e) => setAudio({ music: Number(e.target.value) })}
            />
            <span className="val">{Math.round(audio.music * 100)}</span>
          </div>
          <div className="slider-row">
            <label>Effects</label>
            <input
              type="range" min={0} max={1} step={0.05} value={audio.sfx}
              onChange={(e) => setAudio({ sfx: Number(e.target.value) })}
            />
            <span className="val">{Math.round(audio.sfx * 100)}</span>
          </div>
          <div className="slider-row">
            <label>Mute all</label>
            <input
              type="checkbox"
              checked={audio.muted}
              onChange={(e) => setAudio({ muted: e.target.checked })}
            />
          </div>

          <hr className="divider" />
          <h3 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-dim)' }}>Enemy turn speed</h3>
          <div className="btn-row">
            <button className={`btn small ${aiSpeed >= 900 ? 'active' : ''}`} onClick={() => setAISpeed(900)}>Normal</button>
            <button className={`btn small ${aiSpeed === 400 ? 'active' : ''}`} onClick={() => setAISpeed(400)}>Fast</button>
            <button className={`btn small ${aiSpeed === 80 ? 'active' : ''}`} onClick={() => setAISpeed(80)}>Instant</button>
          </div>

          <hr className="divider" />
          <h3 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-dim)' }}>Graphics</h3>
          <div className="btn-row">
            <button className={`btn small ${quality === 'high' ? 'active' : ''}`} onClick={() => setQuality('high')}>High</button>
            <button className={`btn small ${quality === 'low' ? 'active' : ''}`} onClick={() => setQuality('low')}>Low (no post effects)</button>
          </div>
          <div className="btn-row">
            <button className={`btn small ${counterMode ? 'active' : ''}`} onClick={toggleCounterMode}>
              {counterMode ? 'Counters forced (Tab)' : 'Miniatures near / counters far (Tab)'}
            </button>
          </div>

          {game && (
            <>
              <hr className="divider" />
              <h3 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-dim)' }}>Save campaign</h3>
              {Array.from({ length: SLOT_COUNT }, (_, i) => (
                <div className="save-slot-row" key={i}>
                  <div className="meta">
                    Slot {i + 1}
                    <div className="when">
                      {slots[i] ? `${slots[i]!.label} · ${slots[i]!.faction} · ${new Date(slots[i]!.savedAt).toLocaleString()}` : 'empty'}
                    </div>
                  </div>
                  <button className="btn small" onClick={() => saveToSlot(i)} disabled={game.phase === 'ai'}>Save</button>
                  <button className="btn small" onClick={() => { loadFromSlot(i); setShow(false); }} disabled={!slots[i]}>Load</button>
                </div>
              ))}
            </>
          )}

          <div className="btn-row">
            <button className="btn" onClick={() => setShow(false)}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VictoryScreen() {
  const game = useStore((s) => s.game);
  const toMenu = useStore((s) => s.toMenu);
  if (!game?.result) return null;
  const r = game.result;
  const cls =
    r.outcome === 'decisive-victory' || r.outcome === 'operational-victory'
      ? 'win'
      : r.outcome === 'stalemate'
        ? 'draw'
        : 'loss';

  return (
    <div className="victory-screen">
      <div className="inner panel">
        <h1 className={cls}>{r.headline}</h1>
        <p>{r.detail}</p>
        <div className="scores">
          <div>
            <div className="n">{r.playerScore}</div>
            <div className="l">{game.playerFaction} score</div>
          </div>
          <div>
            <div className="n">{r.enemyScore}</div>
            <div className="l">{opposing(game.playerFaction)} score</div>
          </div>
          <div>
            <div className="n">{r.turn}</div>
            <div className="l">turns</div>
          </div>
        </div>
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <button className="btn primary" onClick={toMenu}>Return to main menu</button>
        </div>
      </div>
    </div>
  );
}
