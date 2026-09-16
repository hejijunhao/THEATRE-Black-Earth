import { describe, expect, it } from 'vitest';
import { buildInitialState } from '../../game/scenarios/build';
import { agencyKind, boardChrome } from '../boardChrome';
import { armyNow, citiesNow, LEXICON, movementNow, strengthNow, warSupportNow } from '../lexicon';
import { theatreBalance } from '../theatreBalance';

describe('encyclopedia now-lines', () => {
  it('names strength by fighting body, not hit points', () => {
    expect(strengthNow(80).tone).toBe('good');
    expect(strengthNow(80).copy).toMatch(/fighting body/);
    expect(strengthNow(40).tone).toBe('warn');
    expect(strengthNow(20).tone).toBe('bad');
    expect(strengthNow(20).copy).toMatch(/collapse/);
  });

  it('marks a spent plate, not a tired one', () => {
    expect(movementNow(0, 5).tone).toBe('bad');
    expect(movementNow(0, 5).copy).toMatch(/spent/);
    expect(movementNow(4, 5).tone).toBe('good');
  });

  it('treats war-support collapse as the political clock', () => {
    expect(warSupportNow(20, 60).tone).toBe('bad');
    expect(warSupportNow(20, 60).copy).toMatch(/8%/);
    expect(warSupportNow(70, 25).tone).toBe('good');
  });

  it('reads city delta against the start, not a raw score', () => {
    expect(citiesNow(40, 50, 0, 3).tone).toBe('bad');
    expect(citiesNow(50, 50, 3, 3).tone).toBe('good');
    expect(citiesNow(50, 50, 1, 3).tone).toBe('even');
  });

  it('ships doctrine entries for the staff terms, not one-line tips', () => {
    for (const id of ['strength', 'movement', 'odds', 'terrain', 'supply'] as const) {
      expect(LEXICON[id].doctrine.split(' ').length).toBeGreaterThan(20);
    }
  });

  it('calls a hollow army when the body ratio collapses', () => {
    expect(armyNow(200, 800, 8, 20).tone).toBe('bad');
    expect(armyNow(800, 700, 20, 18).tone).toBe('even');
  });
});

describe('theatre balance', () => {
  it('opens the designed scenario as Holding, with three needles', () => {
    const state = buildInitialState('UA', 42);
    const b = theatreBalance(state);
    expect(b.headline).toBe('Holding');
    expect(b.cities.held).toBe(b.cities.start);
    expect(b.cities.delta).toBe(0);
    expect(b.support.own).toBeGreaterThan(40);
    expect(b.army.ownCount).toBeGreaterThan(0);
    expect(b.army.fighting).toBeGreaterThan(0);
    expect(b.line).toMatch(/Neither side|Hold/);
  });

  it('reads Breaking when war support is collapsing', () => {
    const state = buildInitialState('UA', 42);
    state.factions.UA.warSupport = 18;
    expect(theatreBalance(state).headline).toBe('Breaking');
  });

  it('reads Pressing when the enemy political clock is failing', () => {
    const state = buildInitialState('UA', 42);
    state.factions.RU.warSupport = 22;
    expect(theatreBalance(state).headline).toBe('Pressing');
  });
});

describe('agency marks', () => {
  it('ranks selected over assault over spent', () => {
    const state = buildInitialState('UA', 42);
    const u3 = state.units.u3;
    const chrome = boardChrome(state, u3, false);
    expect(chrome.canAttack).toBe(true);
    expect(agencyKind(chrome, true)).toBe('selected');
    expect(agencyKind(chrome, false)).toBe('assault');

    const spent = boardChrome(state, { ...u3, movement: 0 }, false);
    expect(agencyKind(spent, false)).toBe('contact');
    const spentQuiet = boardChrome(state, { ...u3, movement: 0, tile: '0,0' }, false);
    expect(spentQuiet.inContact || spentQuiet.canAttack).toBe(false);
    expect(agencyKind(spentQuiet, false)).toBe('spent');
  });
});
