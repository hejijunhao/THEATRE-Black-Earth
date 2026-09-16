// Bound journal: week, weather, engagements with dice, then the live
// concerns. Replaces the toast strip — a book, not a feed.

import { useMemo } from 'react';
import { WEATHER_DEFS } from '../game/data/defs';
import { neighborIds } from '../game/hex';
import { formatTurnDate } from '../game/rules/weather';
import { useStore } from '../game/state/store';
import { opposing } from '../game/types';

interface Card {
  key: string;
  tone: 'gold' | 'red' | 'amber' | 'green' | '';
  title: string;
  body: string;
}

interface Engagement {
  id: number;
  turn: number;
  text: string;
  atk?: number;
  def?: number;
}

const DICE_RE = /2d6\s+(\d+)(?:[–-](\d+)| vs (\d+))?/;

function parseEngagement(text: string, id: number, turn: number): Engagement {
  const m = text.match(DICE_RE);
  return {
    id,
    turn,
    text,
    atk: m ? Number(m[1]) : undefined,
    def: m ? Number(m[2] ?? m[3]) : undefined,
  };
}

export function Journal() {
  const game = useStore((s) => s.game);

  const { cards, engagements } = useMemo(() => {
    if (!game) return { cards: [] as Card[], engagements: [] as Engagement[] };
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

    const engagements = game.notifications
      .filter((n) => n.kind === 'combat' || n.kind === 'capture')
      .slice(-5)
      .reverse()
      .map((n) => parseEngagement(n.text, n.id, n.turn));

    return { cards: out, engagements };
  }, [game]);

  if (!game || game.phase !== 'player') return null;

  return (
    <div className="bound-journal" aria-label="Theatre journal">
      <div className="bj-spine" aria-hidden />
      <div className="bj-page">
        <div className="bj-head">
          <span className="bj-week">Week {game.turn}</span>
          <span className="bj-wx">{WEATHER_DEFS[game.weather].label}</span>
          <span className="bj-date">{formatTurnDate(game)}</span>
        </div>

        {engagements.length > 0 && (
          <div className="bj-section">
            <div className="bj-kicker">Engagements</div>
            {engagements.map((e) => (
              <div key={e.id} className="bj-fight">
                <span className="bj-turn">T{e.turn}</span>
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
