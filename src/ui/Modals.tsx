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

export function CombatResultPanel() {
  const game = useStore((s) => s.game);
  const result = useStore((s) => s.lastCombat);
  const dismissCombat = useStore((s) => s.dismissCombat);
  if (!game || !result || game.phase !== 'player') return null;

  const attacker = game.units[result.attackerId];

  return (
    <div
      className="panel"
      style={{ position: 'absolute', top: 58, left: 12, width: 300, zIndex: 22 }}
    >
      <div className="panel-title">
        Engagement Result
        <span className="sub">Turn {game.turn}</span>
      </div>
      <div style={{ padding: '10px 14px' }}>
        <div className="kv-line"><span className="k">Attacker losses</span><span className="v">−{Math.round(result.attackerLoss)} str</span></div>
        <div className="kv-line"><span className="k">Defender losses</span><span className="v">−{Math.round(result.defenderLoss)} str</span></div>
        <div className="kv-line"><span className="k">Readiness</span><span className="v">−{Math.round(result.attackerReadinessLoss)} / −{Math.round(result.defenderReadinessLoss)}</span></div>
        <div className="kv-line"><span className="k">Morale</span><span className="v">−{Math.round(result.attackerMoraleLoss)} / −{Math.round(result.defenderMoraleLoss)}</span></div>
        <hr className="divider" />
        {result.defenderDestroyed && <p style={{ color: 'var(--red)', margin: '4px 0' }}>The defending formation was destroyed.</p>}
        {result.defenderRetreated && !result.defenderDestroyed && <p style={{ color: 'var(--amber)', margin: '4px 0' }}>The defenders fell back.</p>}
        {result.tileCaptured && <p style={{ color: 'var(--gold)', margin: '4px 0' }}>Ground captured.</p>}
        {!result.defenderRetreated && !result.defenderDestroyed && <p style={{ margin: '4px 0' }}>The line held. Repeated pressure may still break it.</p>}
        {attacker && (
          <p className="hint">
            {attacker.name}: {Math.round(attacker.strength)}% strength, {Math.round(attacker.readiness)}% readiness.
          </p>
        )}
        <div className="btn-row">
          <button className="btn" onClick={dismissCombat}>Dismiss</button>
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
