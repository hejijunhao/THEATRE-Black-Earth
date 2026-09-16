import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildInitialState } from '../scenarios/build';
import {
  computePreview,
  describeEngagement,
  exchangeLosses,
  fortuneFrom2d6,
  formatOdds,
  resolveBombardment,
  resolveCombat,
  verdictFromRatio,
} from '../rules/combat';
import { drawInt, rollDice } from '../rng';

describe('dice', () => {
  it('drawInt stays inclusive of both ends', () => {
    let state = 99;
    const seen = new Set<number>();
    for (let i = 0; i < 80; i++) {
      const d = drawInt(state, 1, 6);
      seen.add(d.value);
      state = d.next;
    }
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...seen)).toBeLessThanOrEqual(6);
    expect(seen.size).toBeGreaterThan(1);
  });

  it('rollDice returns count faces in 1..sides', () => {
    const roll = rollDice(7, 2, 6);
    expect(roll.values).toHaveLength(2);
    expect(roll.total).toBe(roll.values[0] + roll.values[1]);
    for (const v of roll.values) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
    expect(roll.total).toBeGreaterThanOrEqual(2);
    expect(roll.total).toBeLessThanOrEqual(12);
  });
});

describe('combat math', () => {
  it('maps 2d6 totals onto a readable fortune band centred on 7', () => {
    expect(fortuneFrom2d6(2)).toBeCloseTo(0.7);
    expect(fortuneFrom2d6(7)).toBeCloseTo(1.0);
    expect(fortuneFrom2d6(12)).toBeCloseTo(1.3);
  });

  it('formats odds from either side of even', () => {
    expect(formatOdds(2)).toBe('2.0 : 1');
    expect(formatOdds(0.5)).toBe('1 : 2.0');
    expect(formatOdds(0)).toBe('—');
  });

  it('classifies verdicts from ratio', () => {
    expect(verdictFromRatio(2.1)).toBe('decisive');
    expect(verdictFromRatio(1.4)).toBe('favourable');
    expect(verdictFromRatio(1.0)).toBe('even');
    expect(verdictFromRatio(0.7)).toBe('risky');
    expect(verdictFromRatio(0.4)).toBe('severe');
  });

  it('lets the attack roll decide damage given and the defence roll decide damage taken', () => {
    const even = exchangeLosses(1, 1, 1, 0);
    const hotAttack = exchangeLosses(1, 1.3, 1, 0);
    const hotDefence = exchangeLosses(1, 1, 1.3, 0);
    expect(hotAttack.defenderLoss).toBeGreaterThan(even.defenderLoss);
    expect(hotAttack.attackerLoss).toBeCloseTo(even.attackerLoss);
    expect(hotDefence.attackerLoss).toBeGreaterThan(even.attackerLoss);
    expect(hotDefence.defenderLoss).toBeCloseTo(even.defenderLoss);
  });

  it('preview expected losses match an average-fortune exchange', () => {
    const state = buildInitialState('UA', 7);
    const preview = computePreview(state, state.units.u3, state.units.r1);
    const expected = exchangeLosses(preview.ratio, 1, 1, state.units.r1.entrenchment);
    expect(preview.expectedAttackerLoss).toBeCloseTo(expected.attackerLoss);
    expect(preview.expectedDefenderLoss).toBeCloseTo(expected.defenderLoss);
    expect(preview.oddsLabel.length).toBeGreaterThan(0);
  });
});

describe('resolveCombat rolls', () => {
  it('records 2d6 for both sides and names the formations', () => {
    const state = buildInitialState('UA', 7);
    let recorded: ReturnType<typeof resolveCombat> | null = null;
    produce(state, (d) => {
      recorded = resolveCombat(d, 'u3', 'r1');
    });
    expect(recorded).not.toBeNull();
    const result = recorded!;
    expect(result.kind).toBe('assault');
    expect(result.attackerName).toBe(state.units.u3.name);
    expect(result.defenderName).toBe(state.units.r1.name);
    expect(result.attackerRoll.dice).toHaveLength(2);
    expect(result.defenderRoll?.dice).toHaveLength(2);
    expect(result.attackerRoll.total).toBeGreaterThanOrEqual(2);
    expect(result.attackerRoll.total).toBeLessThanOrEqual(12);
    expect(result.defenderRoll!.total).toBeGreaterThanOrEqual(2);
    expect(result.defenderRoll!.total).toBeLessThanOrEqual(12);
    expect(result.attackerStrengthAfter).toBeLessThan(result.attackerStrengthBefore);
    expect(result.defenderStrengthAfter).toBeLessThan(result.defenderStrengthBefore);
    expect(describeEngagement(result)).toContain('2d6');
    expect(describeEngagement(result)).toContain(result.attackerName);
  });

  it('bombardment records a single fire roll and no return-fire losses', () => {
    const state = buildInitialState('UA', 11);
    const arty = Object.values(state.units).find((u) => u.faction === 'UA' && u.type === 'artillery');
    const enemy = Object.values(state.units).find((u) => u.faction === 'RU');
    expect(arty).toBeDefined();
    expect(enemy).toBeDefined();
    let recorded: ReturnType<typeof resolveBombardment> | null = null;
    produce(state, (d) => {
      recorded = resolveBombardment(d, arty!.id, enemy!.id);
    });
    const result = recorded!;
    expect(result.kind).toBe('bombardment');
    expect(result.attackerRoll.dice).toHaveLength(2);
    expect(result.defenderRoll).toBeNull();
    expect(result.attackerLoss).toBe(0);
    expect(result.defenderLoss).toBeGreaterThan(0);
    expect(result.tileCaptured).toBe(false);
  });
});
