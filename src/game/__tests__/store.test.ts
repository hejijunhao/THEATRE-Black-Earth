import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { reachableTiles } from '../rules/movement';

type StoreHook = typeof import('../state/store').useStore;
let useStore: StoreHook;

beforeAll(async () => {
  const mem = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => { mem.set(k, String(v)); },
      removeItem: (k: string) => { mem.delete(k); },
      clear: () => mem.clear(),
    },
  });
  ({ useStore } = await import('../state/store'));
});

describe('selectTile issues a march', () => {
  beforeEach(() => {
    useStore.getState().newCampaign('UA', false, 42);
  });

  it('moves the selected unit onto a highlighted reachable hex and spends MP', () => {
    const store = useStore.getState();
    const unit = store.game!.units.u1;
    const dest = [...reachableTiles(store.game!, unit).keys()][0];
    expect(dest).toBeTruthy();
    expect(dest).not.toBe(unit.tile);

    store.selectUnit('u1');
    expect(useStore.getState().selectedUnitId).toBe('u1');

    useStore.getState().selectTile(dest);

    const after = useStore.getState();
    expect(after.game!.units.u1.tile).toBe(dest);
    expect(after.game!.units.u1.movement).toBeLessThan(unit.movement);
    expect(after.selectedUnitId).toBe('u1');
    expect(after.selectedTileId).toBe(dest);
  });

  it('does not march onto an unreachable hex', () => {
    const store = useStore.getState();
    const unit = store.game!.units.u1;
    store.selectUnit('u1');
    store.selectTile('0,0');

    const after = useStore.getState();
    expect(after.game!.units.u1.tile).toBe(unit.tile);
    expect(after.game!.units.u1.movement).toBe(unit.movement);
  });

  it('opens the attack preview when clicking an adjacent enemy', () => {
    const origin = useStore.getState().game!.units.u3.tile;
    useStore.getState().selectUnit('u3');
    useStore.getState().selectTile(useStore.getState().game!.units.r1.tile);

    const after = useStore.getState();
    expect(after.pendingAttackId).toBe('r1');
    expect(after.game!.units.u3.tile).toBe(origin);
  });

  it('selects another friendly formation instead of moving onto it', () => {
    useStore.getState().selectUnit('u1');
    const other = useStore.getState().game!.units.u2;
    useStore.getState().selectTile(other.tile);

    const after = useStore.getState();
    expect(after.selectedUnitId).toBe('u2');
    expect(after.game!.units.u1.tile).not.toBe(other.tile);
  });
});
