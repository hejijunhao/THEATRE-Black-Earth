// Bound journal: paper/ink, week chronology, then the live concerns.
// A book, not a feed.

import { useMemo } from 'react';
import { WEATHER_DEFS } from '../game/data/defs';
import { neighborIds } from '../game/hex';
import { formatTurnDate } from '../game/rules/weather';
import { useStore } from '../game/state/store';
import { opposing } from '../game/types';
import { bindChronology } from './journalChronology';

interface Card {
  key: string;
  tone: 'gold' | 'red' | 'amber' | 'green' | '';
  title: string;
  body: string;
}

export function Journal() {
  const game = useStore((s) => s.game);
  const pendingAttackId = useStore((s) => s.pendingAttackId);

  const { cards, weeks } = useMemo(() => {
    if (!game) return { cards: [] as Card[], weeks: [] as ReturnType<typeof bindChronology> };
    const out: Card[] = [];
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

    return { cards: out, weeks: bindChronology(game.notifications, 10) };
  }, [game]);

  if (!game || game.phase !== 'player') return null;

  return (
    <div className={`bound-journal${pendingAttackId ? ' tucked' : ''}`} aria-label="Theatre journal">
      <div className="bj-spine" aria-hidden>
        <i /><i /><i />
      </div>
      <div className="bj-page">
        <div className="bj-head">
          <span className="bj-week">Week {game.turn}</span>
          <span className="bj-wx">{WEATHER_DEFS[game.weather].label}</span>
          <span className="bj-date">{formatTurnDate(game)}</span>
        </div>

        {weeks.length > 0 && (
          <div className="bj-section">
            <div className="bj-kicker">Chronology</div>
            {weeks.map((w) => (
              <div key={w.turn} className="bj-week-block">
                <div className="bj-week-lab">Week {w.turn}</div>
                {w.lines.map((e) => (
                  <div key={e.id} className={`bj-fight ${e.kind}`}>
                    <span className="bj-kind">{e.kind}</span>
                    <span className="bj-copy">{e.text}</span>
                    {e.atk != null && (
                      <span className="bj-dice" aria-label={`2d6 ${e.atk}${e.def != null ? ` vs ${e.def}` : ''}`}>
                        <span className="bj-pip">{e.atk}</span>
                        {e.def != null && <span className="bj-pip">{e.def}</span>}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="bj-section">
          <div className="bj-kicker">Situation</div>
          {cards.map((c) => (
            <div key={c.key} className={`bj-card ${c.tone}`}>
              <span className="jc-title">{c.title}</span>
              <span className="jc-body">{c.body}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
