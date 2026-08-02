// AI-vs-AI campaign simulation for balance inspection. Skipped by default;
// run with: BALANCE=1 npx vitest run src/game/__tests__/balance.test.ts

import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { aiTurnDone, planAIQueue, stepAI } from '../ai/ai';
import { resolveGlobalTurn } from '../rules/turn';
import { heldVP } from '../rules/victory';
import { buildInitialState } from '../scenarios/build';
import { FactionId, GameState } from '../types';

function aiActsFor(state: GameState, actor: FactionId): GameState {
  // The AI moves the faction opposing `playerFaction`.
  let s = produce(state, (d) => {
    d.playerFaction = actor === 'UA' ? 'RU' : 'UA';
    d.aiQueue = planAIQueue(d);
    d.aiIndex = 0;
  });
  let guard = 0;
  while (!aiTurnDone(s) && guard < 120) {
    s = produce(s, (d) => {
      stepAI(d);
    });
    guard += 1;
  }
  return s;
}

function summarize(s: GameState) {
  const units = Object.values(s.units);
  const side = (f: FactionId) => units.filter((u) => u.faction === f);
  const avg = (f: FactionId) => {
    const us = side(f);
    return us.length === 0 ? 0 : Math.round(us.reduce((a, u) => a + u.strength, 0) / us.length);
  };
  return {
    turn: s.turn,
    ua: `${side('UA').length}u/${avg('UA')}%/vp${heldVP(s, 'UA')}/ws${Math.round(s.factions.UA.warSupport)}/sc${s.factions.UA.score}`,
    ru: `${side('RU').length}u/${avg('RU')}%/vp${heldVP(s, 'RU')}/ws${Math.round(s.factions.RU.warSupport)}/sc${s.factions.RU.score}`,
  };
}

// Vitest runs under node; declare just enough of `process` to avoid pulling
// in @types/node for the browser-targeted project.
declare const process: { env: Record<string, string | undefined> };

describe.skipIf(!process.env.BALANCE)('AI vs AI balance', () => {
  it('plays a full campaign', () => {
    for (const seed of [11, 42]) {
      let state = buildInitialState('UA', seed);
      const log: unknown[] = [summarize(state)];
      while (state.phase !== 'ended' && state.turn < state.scenario.maxTurns + 1) {
        state = aiActsFor(state, 'RU'); // RU acts (player=UA)
        state = aiActsFor(state, 'UA'); // UA acts (player=RU)
        state = produce(state, (d) => {
          d.playerFaction = 'UA';
          resolveGlobalTurn(d);
          d.pendingEvent = null; // auto-dismiss events in simulation
        });
        if (state.turn % 6 === 0 || state.phase === 'ended') log.push(summarize(state));
      }
      // eslint-disable-next-line no-console
      console.log(`seed ${seed}:`, JSON.stringify(log, null, 1));
      // eslint-disable-next-line no-console
      console.log(`seed ${seed} result:`, JSON.stringify(state.result));
      expect(state.turn).toBeGreaterThan(5);
    }
  }, 120000);
});
