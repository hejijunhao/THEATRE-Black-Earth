import { describe, expect, it } from 'vitest';
import { buildInitialState } from '../../game/scenarios/build';
import { cycleUnspent, formationLane } from '../boardChrome';
import { rankReasons, reasonCopy, reasonWeight } from '../briefingCopy';
import { paperDock, paperLayoutFromScreen, SHEET_GAP } from '../combatPaper';
import { chronologyTile } from '../journalChronology';
import { bindChronology, parseDice } from '../journalChronology';
import { CombatFactor, NotificationEntry } from '../../game/types';

function factor(label: string, value: number): CombatFactor {
  return { label, value, side: value < 0 ? 'attacker' : 'defender' };
}

describe('staff estimate ranking', () => {
  it('keeps at most five named reasons and drops noise', () => {
    const ranked = rankReasons([
      factor('Terrain (Urban)', 0.4),
      factor('Entrenchment (2)', 0.24),
      factor('Weather (Mud)', -0.15),
      factor('Attacker supply (strained)', -0.12),
      factor('Artillery support', 0.08),
      factor('Veterancy', 0.05),
      factor('Tiny', 0.02),
    ]);
    expect(ranked).toHaveLength(5);
    expect(ranked[0].label).toMatch(/Urban/);
    expect(ranked.some((f) => f.label === 'Tiny')).toBe(false);
    expect(ranked.every((f) => Math.abs(f.value) >= 0.04)).toBe(true);
  });

  it('writes named copy, not a percentage dump', () => {
    const copy = reasonCopy(factor('Entrenchment (2)', 0.24));
    expect(copy).toMatch(/dug in/i);
    expect(copy).not.toMatch(/%/);
    expect(reasonCopy(factor('River assault', -0.3))).toMatch(/wet bank/i);
    expect(reasonWeight(factor('Terrain (Urban)', 0.4))).toBe(1);
    expect(reasonWeight(factor('Weather (Mud)', -0.15))).toBeLessThan(1);
  });
});

describe('combat paper dock', () => {
  it('falls back to tile-grid side when the projector has not spoken', () => {
    expect(paperDock('8,18').side).toBe('east');
    expect(paperDock('36,18').side).toBe('west');
    expect(paperDock('24,6').yBias).toBe('low');
    expect(paperDock('24,18').yBias).toBe('mid');
    expect(paperDock('24,30').yBias).toBe('high');
  });

  it('docks from the contested hex screen position and leaves the pulse clear', () => {
    const westHex = paperLayoutFromScreen(
      { x: 420, y: 360 },
      { w: 1600, h: 1000 },
      { w: 500, h: 320 },
    );
    expect(westHex.side).toBe('east');
    expect(westHex.left).toBeGreaterThan(420 + SHEET_GAP - 1);
    expect(westHex.callout.x1).toBe(420);
    expect(westHex.callout.y1).toBe(360);
    expect(westHex.callout.x2).toBe(westHex.left);

    const eastHex = paperLayoutFromScreen(
      { x: 1180, y: 400 },
      { w: 1600, h: 1000 },
      { w: 500, h: 320 },
    );
    expect(eastHex.side).toBe('west');
    expect(eastHex.left + eastHex.width).toBeLessThan(1180 - SHEET_GAP + 1);
    expect(eastHex.callout.x2).toBe(eastHex.left + eastHex.width);
  });
});

describe('ops rail cycle', () => {
  it('walks contact then march and skips spent', () => {
    const state = buildInitialState('UA', 42);
    const first = cycleUnspent(state, null);
    expect(first).toBeTruthy();
    const unit = state.units[first!];
    expect(formationLane(state, unit)).not.toBe('spent');

    const spent = state.units.u3;
    expect(spent).toBeTruthy();
    spent.movement = 0;
    spent.hasAttacked = true;
    const next = cycleUnspent(state, 'u3');
    expect(next).not.toBe('u3');
    if (next) expect(formationLane(state, state.units[next])).not.toBe('spent');
  });
});

describe('bound journal chronology', () => {
  it('parses 2d6 from combat lines', () => {
    expect(parseDice('57th hits 20th MRD — 2d6 9–5')).toEqual({ atk: 9, def: 5 });
    expect(parseDice('Fires on the ridge — 2d6 7 vs 4')).toEqual({ atk: 7, def: 4 });
    expect(parseDice('Melitopol taken')).toEqual({});
  });

  it('treats the week as the chapter, newest first', () => {
    const notes: NotificationEntry[] = [
      { id: 1, turn: 1, kind: 'info', text: 'Week opens.' },
      { id: 2, turn: 1, kind: 'combat', text: '57th against 20th MRD — 2d6 8–6' },
      { id: 3, turn: 2, kind: 'capture', text: 'Melitopol taken' },
    ];
    const weeks = bindChronology(notes, 10);
    expect(weeks.map((w) => w.turn)).toEqual([2, 1]);
    expect(weeks[0].lines[0].kind).toBe('capture');
    const fight = weeks[1].lines.find((l) => l.kind === 'combat');
    expect(fight?.atk).toBe(8);
    expect(fight?.def).toBe(6);
  });

  it('focuses the last named living unit, else a city', () => {
    const state = buildInitialState('UA', 42);
    const atk = Object.values(state.units).find((u) => u.faction === 'UA')!;
    const def = Object.values(state.units).find((u) => u.faction === 'RU')!;
    expect(chronologyTile(state, `${atk.name} vs ${def.name} · 2d6 8–6`)).toBe(def.tile);
    const city = Object.values(state.cities).find((c) => c.name === 'Melitopol')!;
    expect(chronologyTile(state, 'Melitopol has been captured by Ukrainian forces.')).toBe(city.tile);
    expect(chronologyTile(state, 'Week opens.')).toBeNull();
  });
});
