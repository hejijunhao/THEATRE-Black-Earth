// The journal / situation rail (v2-vision §7.2): a right-hand card stack for
// the campaign's live concerns — decisive-city progress, threatened cities,
// isolated formations, pending decisions, operation cooldowns, war-support
// state. Everything is derived from GameState each render; nothing scrolls
// away the way transient notifications do.

import { useMemo } from 'react';
import { OPERATION_DEFS } from '../game/data/defs';
import { neighborIds } from '../game/hex';
import { useStore } from '../game/state/store';
import { OperationId, opposing } from '../game/types';
import { Ico } from './icons';

interface Card {
  key: string;
  icon: string;
  tone: 'gold' | 'red' | 'amber' | 'green' | '';
  title: string;
  body: string;
}

export function Journal() {
  const game = useStore((s) => s.game);

  const cards = useMemo(() => {
    if (!game) return [];
    const out: Card[] = [];
    const player = game.playerFaction;
    const enemy = opposing(player);

    // Decisive objectives: mine and the enemy's.
    const mine = game.scenario.decisive[player];
    const held = mine.filter((id) => game.tiles[game.cities[id].tile].controller === player);
    out.push({
      key: 'decisive',
      icon: 'objective',
      tone: held.length === mine.length ? 'green' : 'gold',
      title: 'Decisive objectives',
      body: mine
        .map((id) => `${game.cities[id].name} ${game.tiles[game.cities[id].tile].controller === player ? '✓' : '—'}`)
        .join(' · '),
    });
    const theirs = game.scenario.decisive[enemy];
    const theirHeld = theirs.filter((id) => game.tiles[game.cities[id].tile].controller === enemy);
    if (theirHeld.length > 0) {
      out.push({
        key: 'decisive-enemy',
        icon: 'threat',
        tone: theirHeld.length === theirs.length ? 'red' : 'amber',
        title: 'Enemy decisive progress',
        body: theirs
          .map((id) => `${game.cities[id].name} ${game.tiles[game.cities[id].tile].controller === enemy ? '✗' : 'safe'}`)
          .join(' · '),
      });
    }

    // Threatened friendly cities: enemy formation within 1 hex.
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
        icon: 'threat',
        tone: 'red',
        title: `Threatened ${threatened.length > 1 ? 'cities' : 'city'}`,
        body: threatened.slice(0, 4).join(', ') + (threatened.length > 4 ? '…' : ''),
      });
    }

    // Isolated / low-supply formations.
    const cut = Object.values(game.units).filter(
      (u) => u.faction === player && (u.supply === 'isolated' || u.supply === 'low'),
    );
    if (cut.length > 0) {
      out.push({
        key: 'isolated',
        icon: 'isolated',
        tone: 'amber',
        title: `${cut.length} formation${cut.length > 1 ? 's' : ''} cut off or low`,
        body: cut.slice(0, 3).map((u) => u.name).join(', ') + (cut.length > 3 ? '…' : ''),
      });
    }

    // Pending decision.
    if (game.pendingEvent) {
      out.push({
        key: 'decision',
        icon: 'decision',
        tone: 'gold',
        title: 'Decision awaiting answer',
        body: game.pendingEvent.title,
      });
    }

    // Operation cooldowns.
    const cds = Object.entries(game.factions[player].opCooldowns).filter(([, v]) => (v ?? 0) > 0);
    if (cds.length > 0) {
      out.push({
        key: 'cooldowns',
        icon: 'cooldown',
        tone: '',
        title: 'Operations recharging',
        body: cds
          .map(([id, v]) => `${OPERATION_DEFS[id as OperationId].name.split(' ')[0]} ${v}t`)
          .join(' · '),
      });
    }

    // War-support edge.
    const ws = game.factions[player].warSupport;
    const ews = game.factions[enemy].warSupport;
    out.push({
      key: 'ws',
      icon: 'trend',
      tone: ws < 30 ? 'red' : ws < 45 ? 'amber' : ews < 30 ? 'green' : '',
      title: 'War support',
      body: `${Math.round(ws)}% vs foe ${Math.round(ews)}% — collapse below 8%`,
    });

    return out;
  }, [game]);

  if (!game || game.phase !== 'player' || cards.length === 0) return null;

  return (
    <div className="journal">
      {cards.map((c) => (
        <div key={c.key} className={`journal-card ${c.tone}`}>
          <span className="ico"><Ico name={c.icon} size={13} /></span>
          <div>
            <span className="jc-title">{c.title}</span>
            <span className="jc-body">{c.body}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
