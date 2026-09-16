import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildInitialState } from '../scenarios/build';
import { hexDistance, neighborIds } from '../hex';
import { reachableTiles, unitOnTile } from '../rules/movement';
import { computePreview, resolveCombat } from '../rules/combat';
import { planAIQueue, stepAI, aiTurnDone } from '../ai/ai';
import { resolveGlobalTurn } from '../rules/turn';

describe('hex grid', () => {
  it('computes symmetric adjacency', () => {
    for (const id of ['5,5', '10,2', '13,12', '21,4']) {
      for (const n of neighborIds(id)) {
        expect(neighborIds(n)).toContain(id);
      }
    }
  });

  it('computes distance', () => {
    expect(hexDistance('10,2', '10,2')).toBe(0);
    expect(hexDistance('10,2', '11,2')).toBe(1);
    expect(hexDistance('0,0', '5,0')).toBe(5);
  });
});

describe('scenario build', () => {
  const state = buildInitialState('UA', 42);

  it('produces a playable map in the target size range', () => {
    // v2: 48×36 geodata-derived grid, ~900 land hexes (v2-vision §3.4).
    const land = Object.values(state.tiles).filter((t) => t.terrain !== 'water');
    expect(land.length).toBeGreaterThan(700);
    expect(land.length).toBeLessThan(1200);
  });

  it('assigns starting control correctly', () => {
    expect(state.tiles[state.cities.kyiv.tile].controller).toBe('UA');
    expect(state.tiles[state.cities.donetsk.tile].controller).toBe('RU');
    expect(state.tiles[state.cities.sevastopol.tile].controller).toBe('RU');
  });

  it('places 26-40 units per side without stacking', () => {
    const ua = Object.values(state.units).filter((u) => u.faction === 'UA');
    const ru = Object.values(state.units).filter((u) => u.faction === 'RU');
    expect(ua.length).toBeGreaterThanOrEqual(26);
    expect(ua.length).toBeLessThanOrEqual(40);
    expect(ru.length).toBeGreaterThanOrEqual(26);
    expect(ru.length).toBeLessThanOrEqual(40);
    const tiles = Object.values(state.units).map((u) => u.tile);
    expect(new Set(tiles).size).toBe(tiles.length);
  });

  it('supplies most starting units', () => {
    const bad = Object.values(state.units).filter(
      (u) => u.supply === 'isolated' || u.supply === 'low',
    );
    expect(bad.length).toBe(0);
  });

  it('has river edges including a bridged Dnipro crossing near Kyiv', () => {
    expect(state.riverEdges.length).toBeGreaterThan(60);
    expect(state.bridgeEdges.length).toBeGreaterThan(10);
    // A bridge must exist within two hexes of the capital (the Kyiv crossings).
    const kyiv = state.cities.kyiv.tile;
    const nearKyiv = state.bridgeEdges.some((edge) =>
      edge.split('|').some((t) => hexDistance(t, kyiv) <= 2),
    );
    expect(nearKyiv).toBe(true);
  });
});

describe('movement', () => {
  const state = buildInitialState('UA', 42);

  it('finds reachable tiles for a rear unit', () => {
    const unit = state.units.u1; // 1st Tank Brigade at 18,3
    const reach = reachableTiles(state, unit);
    expect(reach.size).toBeGreaterThan(3);
    for (const info of reach.values()) {
      expect(info.cost).toBeLessThanOrEqual(unit.movement + 1e-9);
    }
  });

  it('does not allow entering occupied or water tiles', () => {
    const unit = state.units.u1;
    const reach = reachableTiles(state, unit);
    for (const id of reach.keys()) {
      expect(unitOnTile(state, id)).toBeUndefined();
      expect(state.tiles[id].terrain).not.toBe('water');
    }
  });

  it('stops movement when entering enemy ZOC', () => {
    const unit = state.units.u2; // 92nd Mechanised at 20,3 near the front
    const reach = reachableTiles(state, unit);
    for (const info of reach.values()) {
      if (info.entersZOC) {
        // ZOC tile must be terminal: path ends there.
        expect(info.path[info.path.length - 1]).toBe(info.id);
      }
    }
  });
});

describe('combat', () => {
  it('is deterministic for a given seed', () => {
    const a = buildInitialState('UA', 7);
    const b = buildInitialState('UA', 7);
    const resultA = produce(a, (d) => {
      resolveCombat(d, 'u3', 'r1');
    });
    const resultB = produce(b, (d) => {
      resolveCombat(d, 'u3', 'r1');
    });
    expect(resultA.units.u3?.strength).toBe(resultB.units.u3?.strength);
    expect(resultA.rngState).toBe(resultB.rngState);
  });

  it('produces degradation rather than annihilation for even fights', () => {
    const state = buildInitialState('UA', 7);
    const next = produce(state, (d) => {
      resolveCombat(d, 'u3', 'r1');
    });
    // Both sides survive a single even engagement.
    expect(next.units.u3).toBeDefined();
    expect(next.units.r1).toBeDefined();
    expect(next.units.r1!.strength).toBeLessThan(state.units.r1.strength);
  });

  it('previews include factors and a verdict', () => {
    const state = buildInitialState('UA', 7);
    const preview = computePreview(state, state.units.u3, state.units.r1);
    expect(preview.factors.length).toBeGreaterThan(0);
    expect(['decisive', 'favourable', 'even', 'risky', 'severe']).toContain(preview.verdict);
    expect(preview.oddsLabel).toMatch(/:/);
    expect(preview.expectedDefenderLoss).toBeGreaterThan(0);
  });
});

describe('full turn cycle', () => {
  it('runs an AI turn and advances to the next player turn', () => {
    let state = buildInitialState('UA', 99);
    state = produce(state, (d) => {
      d.phase = 'ai';
      d.aiQueue = planAIQueue(d);
      d.aiIndex = 0;
    });
    let steps = 0;
    while (!aiTurnDone(state) && steps < 400) {
      state = produce(state, (d) => {
        stepAI(d);
      });
      steps += 1;
    }
    expect(steps).toBeLessThan(400);
    state = produce(state, (d) => {
      resolveGlobalTurn(d);
    });
    expect(state.turn).toBe(2);
    expect(state.phase === 'player' || state.phase === 'ended').toBe(true);
    // Movement refreshed for player units.
    const anyMobile = Object.values(state.units).some(
      (u) => u.faction === 'UA' && u.movement > 0,
    );
    expect(anyMobile).toBe(true);
  });

  it('survives ten full turns without corruption', () => {
    let state = buildInitialState('RU', 5);
    for (let t = 0; t < 10 && state.phase !== 'ended'; t++) {
      state = produce(state, (d) => {
        d.phase = 'ai';
        d.aiQueue = planAIQueue(d);
        d.aiIndex = 0;
      });
      let guard = 0;
      while (!aiTurnDone(state) && guard < 400) {
        state = produce(state, (d) => {
          stepAI(d);
        });
        guard += 1;
      }
      state = produce(state, (d) => {
        resolveGlobalTurn(d);
      });
      // Clear any pending event as a player would.
      if (state.pendingEvent) {
        state = produce(state, (d) => {
          d.pendingEvent = null;
        });
      }
    }
    // State remains serializable and structurally sound.
    const json = JSON.stringify(state);
    expect(json.length).toBeGreaterThan(1000);
    for (const unit of Object.values(state.units)) {
      expect(state.tiles[unit.tile]).toBeDefined();
      expect(unit.strength).toBeGreaterThan(0);
    }
  });
});

describe('save roundtrip', () => {
  it('serializes and restores identically', () => {
    const state = buildInitialState('UA', 123);
    const restored = JSON.parse(JSON.stringify(state));
    expect(restored).toEqual(state);
    expect(restored.tiles[state.cities.kyiv.tile].cityId).toBe('kyiv');
  });
});
