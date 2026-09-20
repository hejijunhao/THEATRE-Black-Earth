// Journal overlay: week chapters as type, situation as a single sitrep line.
// Same instrument language as the strip — not a bound parchment book.

import { useMemo } from 'react';
import { WEATHER_DEFS } from '../game/data/defs';
import { neighborIds } from '../game/hex';
import { formatTurnDate } from '../game/rules/weather';
import { useStore } from '../game/state/store';
import { opposing } from '../game/types';
import { showJournalPanel } from './hudChrome';
import { bindChronology, chronologyTile } from './journalChronology';

interface Note {
  key: string;
  tone: 'gold' | 'red' | 'amber' | 'green' | '';
  title: string;
  body: string;
}

export function Journal() {
  const game = useStore((s) => s.game);
  const pendingAttackId = useStore((s) => s.pendingAttackId);
  const lastCombat = useStore((s) => s.lastCombat);
  const showJournal = useStore((s) => s.showJournal);
  const showDossier = useStore((s) => s.showDossier);
  const showTheatreClock = useStore((s) => s.showTheatreClock);
  const pinnedLexiconId = useStore((s) => s.pinnedLexiconId);
  const selectedUnitId = useStore((s) => s.selectedUnitId);
  const interactionMode = useStore((s) => s.interactionMode);
  const setShowJournal = useStore((s) => s.setShowJournal);
  const focusCamera = useStore((s) => s.focusCamera);
  const selectTile = useStore((s) => s.selectTile);
  const hoverTile = useStore((s) => s.hoverTile);

  const { notes, weeks } = useMemo(() => {
    if (!game) return { notes: [] as Note[], weeks: [] as ReturnType<typeof bindChronology> };
    const out: Note[] = [];
    const player = game.playerFaction;
    const enemy = opposing(player);

    const mine = game.scenario.decisive[player];
    const held = mine.filter((id) => game.tiles[game.cities[id].tile].controller === player);
    out.push({
      key: 'decisive',
      tone: held.length === mine.length ? 'green' : 'gold',
      title: 'Decisive',
      body: mine
        .map((id) => `${game.cities[id].name} ${game.tiles[game.cities[id].tile].controller === player ? 'held' : '—'}`)
        .join(' · '),
    });

    const threatened: string[] = [];
    for (const city of Object.values(game.cities)) {
      if (game.tiles[city.tile].controller !== player || city.vp === 0) continue;
      const danger = [city.tile, ...neighborIds(city.tile)].some((t) => {
        const u = Object.values(game.units).find((u2) => u2.tile === t && u2.faction === enemy);
        return Boolean(u);
      });
      if (danger) threatened.push(city.name);
    }
    if (threatened.length > 0) {
      out.push({
        key: 'threat',
        tone: 'red',
        title: threatened.length > 1 ? 'Threatened cities' : 'Threatened city',
        body: threatened.slice(0, 4).join(', ') + (threatened.length > 4 ? '…' : ''),
      });
    }

    const cut = Object.values(game.units).filter(
      (u) => u.faction === player && (u.supply === 'isolated' || u.supply === 'low'),
    );
    if (cut.length > 0) {
      out.push({
        key: 'isolated',
        tone: 'amber',
        title: `${cut.length} cut off or low`,
        body: cut.slice(0, 3).map((u) => u.name).join(', ') + (cut.length > 3 ? '…' : ''),
      });
    }

    if (game.pendingEvent) {
      out.push({
        key: 'decision',
        tone: 'gold',
        title: 'Decision waiting',
        body: game.pendingEvent.title,
      });
    }

    return { notes: out, weeks: bindChronology(game.notifications, 10) };
  }, [game]);

  if (!game || game.phase !== 'player') return null;
  if (!showJournalPanel({
    selectedUnitId,
    showJournal,
    showDossier,
    showTheatreClock,
    pinnedLexiconId,
    pendingAttackId,
    lastCombat,
    interactionMode,
  })) return null;

  return (
    <div className="bound-journal journal-overlay on-demand" aria-label="Theatre journal">
      <div className="jl-head">
        <span className="jl-kicker">Journal</span>
        <span className="jl-week">Week {game.turn}</span>
        <span className="jl-wx">{WEATHER_DEFS[game.weather].label}</span>
        <span className="jl-date">{formatTurnDate(game)}</span>
        <button
          type="button"
          className="jl-close"
          onClick={() => setShowJournal(false)}
          title="Close journal · J"
        >
          Close
        </button>
      </div>

      {notes.length > 0 && (
        <aside className="jl-sit" aria-label="Situation">
          {notes.map((c) => (
            <p key={c.key} className={`jl-note ${c.tone}`}>
              <em>{c.title}</em>
              {c.body}
            </p>
          ))}
        </aside>
      )}

      {weeks.length > 0 && (
        <div className="jl-weeks">
          {weeks.map((w) => (
            <div key={w.turn} className="jl-chapter">
              <div className="jl-chap-head">
                <span>Week {w.turn}</span>
                <i />
              </div>
              {w.lines.map((e) => {
                const hex = chronologyTile(game, e.text);
                const body = (
                  <>
                    <span className="bj-kind">{e.kind}</span>
                    <span className="bj-copy">{e.text}</span>
                    {e.atk != null && (
                      <span className="bj-dice" aria-label={`2d6 ${e.atk}${e.def != null ? ` vs ${e.def}` : ''}`}>
                        <span className="bj-pip">{e.atk}</span>
                        {e.def != null && <span className="bj-pip">{e.def}</span>}
                      </span>
                    )}
                  </>
                );
                if (!hex) {
                  return <div key={e.id} className={`bj-fight ${e.kind}`}>{body}</div>;
                }
                return (
                  <button
                    key={e.id}
                    type="button"
                    className={`bj-fight ${e.kind} locatable`}
                    onMouseEnter={() => hoverTile(hex)}
                    onMouseLeave={() => hoverTile(null)}
                    onClick={() => {
                      selectTile(hex);
                      focusCamera(hex);
                    }}
                  >
                    {body}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
