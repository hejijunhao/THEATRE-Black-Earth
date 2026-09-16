import { describe, expect, it } from 'vitest';
import { buildInitialState } from '../../game/scenarios/build';
import { boardChrome, threatenedIds, unitOrders } from '../boardChrome';

describe('board chrome', () => {
  const state = buildInitialState('UA', 42);
  // 57th Motorised (u3) starts adjacent to 20th MRD (r1).
  const u3 = state.units.u3;
  const r1 = state.units.r1;

  it('marks a fresh front-line formation idle, with MP and contact', () => {
    expect(u3).toBeTruthy();
    const chrome = boardChrome(state, u3, false);
    expect(chrome.showMp).toBe(true);
    expect(chrome.idle).toBe(true);
    expect(chrome.spent).toBe(false);
    expect(chrome.mp).toBeGreaterThan(0);
    expect(chrome.inContact).toBe(true);
    expect(chrome.contactCount).toBeGreaterThan(0);
  });

  it('dims a spent friendly and hides MP on the enemy', () => {
    const spent = { ...u3, movement: 0, hasAttacked: true };
    const chrome = boardChrome(state, spent, false);
    expect(chrome.spent).toBe(true);
    expect(chrome.idle).toBe(false);
    expect(chrome.inContact).toBe(false);

    const enemy = boardChrome(state, r1, true);
    expect(enemy.showMp).toBe(false);
    expect(enemy.spent).toBe(false);
    expect(enemy.threatened).toBe(true);
  });

  it('lists the selected formation\'s legal assault targets', () => {
    const ids = threatenedIds(state, 'u3');
    expect(ids.has('r1')).toBe(true);
  });

  it('exposes legal orders without fabricating disabled ones', () => {
    const orders = unitOrders(state, u3);
    expect(orders.canMove).toBe(true);
    expect(orders.canEntrench).toBe(true);
    expect(orders.contacts.some((t) => t.id === 'r1')).toBe(true);
    expect(orders.spent).toBe(false);
  });
});
