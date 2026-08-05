// Main menu: new campaign (faction choice), continue, load, settings.

import { useEffect, useState } from 'react';
import { autosaveHeader, hasAutosave, slotHeaders } from '../game/state/save';
import { useStore } from '../game/state/store';
import { FactionId } from '../game/types';

export function MainMenu() {
  const newCampaign = useStore((s) => s.newCampaign);
  const continueCampaign = useStore((s) => s.continueCampaign);
  const loadFromSlot = useStore((s) => s.loadFromSlot);
  const ensureMenuBackdrop = useStore((s) => s.ensureMenuBackdrop);
  // The menu sits over the live theatre at dawn.
  useEffect(() => ensureMenuBackdrop(), [ensureMenuBackdrop]);
  const [faction, setFaction] = useState<FactionId>('UA');
  const [tutorial, setTutorial] = useState(true);
  const [confirmNew, setConfirmNew] = useState(false);
  const [showLoad, setShowLoad] = useState(false);

  const auto = autosaveHeader();
  const canContinue = hasAutosave();
  const slots = slotHeaders();

  const startNew = () => {
    if (canContinue && !confirmNew) {
      setConfirmNew(true);
      return;
    }
    newCampaign(faction, tutorial);
  };

  return (
    <div className="main-menu">
      <div className="menu-inner">
        <h1 className="menu-title">
          THEATRE<span className="thin"> · </span>BLACK EARTH
        </h1>
        <div className="menu-ornament" aria-hidden />
        <div className="menu-sub">An operational study · Spring 2025 · designed scenario</div>

        <div className="menu-section">
          <h3>Faction</h3>
          <div className="faction-row">
            <button
              className={`faction-card ${faction === 'UA' ? 'sel-UA' : ''}`}
              onClick={() => setFaction('UA')}
            >
              <h4>Ukraine</h4>
              <p>
                Defensive cohesion, better intelligence, efficient command operations
                and external support — but a smaller reinforcement pool. Hold the line,
                husband reserves, strike where the enemy thins.
              </p>
            </button>
            <button
              className={`faction-card ${faction === 'RU' ? 'sel-RU' : ''}`}
              onClick={() => setFaction('RU')}
            >
              <h4>Russia</h4>
              <p>
                Mass, artillery and deeper reinforcement pools, at the price of slower
                command work and friction far from the rail network. Grind forward,
                trade attrition, keep the pressure on.
              </p>
            </button>
          </div>
        </div>

        <div className="menu-section">
          <button className="menu-btn-large" onClick={startNew}>
            {confirmNew ? 'Existing campaign will be overwritten — start anyway?' : 'New Campaign'}
            <span className="note-sub">
              {faction === 'UA' ? 'Ukraine' : 'Russia'} · ~36 weekly turns · first-turn guidance {tutorial ? 'on' : 'off'}
            </span>
          </button>
          <button className="menu-btn-large" disabled={!canContinue} onClick={continueCampaign}>
            Continue Campaign
            <span className="note-sub">{auto ? `${auto.label} · ${auto.faction} · ${new Date(auto.savedAt).toLocaleString()}` : 'no autosave found'}</span>
          </button>
          <button className="menu-btn-large" onClick={() => setShowLoad(!showLoad)}>
            Load Save
            <span className="note-sub">{slots.filter(Boolean).length} of {slots.length} slots used</span>
          </button>
          {showLoad && (
            <div style={{ paddingLeft: 12 }}>
              {slots.map((s, i) => (
                <button
                  key={i}
                  className="menu-btn-large"
                  disabled={!s}
                  onClick={() => loadFromSlot(i)}
                  style={{ padding: '8px 14px' }}
                >
                  Slot {i + 1}
                  <span className="note-sub">
                    {s ? `${s.label} · ${s.faction} · ${new Date(s.savedAt).toLocaleString()}` : 'empty'}
                  </span>
                </button>
              ))}
            </div>
          )}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--ink-dim)', marginTop: 6 }}>
            <input type="checkbox" checked={tutorial} onChange={(e) => setTutorial(e.target.checked)} />
            First-turn guidance for new campaigns
          </label>
        </div>

        <div className="menu-footer">
          A compact operational wargame set during the contemporary war in Ukraine.
          The map, formations and starting conditions are a deliberately simplified,
          designed scenario — not a reproduction of live battlefield conditions or
          real orders of battle. Casualties are represented abstractly.
        </div>
      </div>
    </div>
  );
}
