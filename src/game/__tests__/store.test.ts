import './localStorageMock';
import { beforeEach, describe, expect, it } from 'vitest';
import { reachableTiles } from '../rules/movement';
import { useStore } from '../state/store';

describe('selectTile orders', () => {
  beforeEach(() => {
    useStore.getState().newCampaign('UA', false, 42);
  });

  it('moves the selected formation onto a reachable empty hex', () => {
    const game = useStore.getState().game!;
    const unit = game.units.u1;
    const dest = [...reachableTiles(game, unit).keys()][0];
    expect(dest).toBeDefined();

    useStore.getState().selectUnit(unit.id);
    useStore.getState().selectTile(dest);

    const next = useStore.getState();
    expect(next.game!.units.u1.tile).toBe(dest);
    expect(next.selectedUnitId).toBe(unit.id);
    expect(next.selectedTileId).toBe(dest);
  });

  it('opens the attack preview when clicking an adjacent enemy', () => {
    const origin = useStore.getState().game!.units.u3.tile;
    useStore.getState().selectUnit('u3');
    useStore.getState().selectTile(useStore.getState().game!.units.r1.tile);

    const next = useStore.getState();
    expect(next.pendingAttackId).toBe('r1');
    expect(next.game!.units.u3.tile).toBe(origin);
  });

  it('selects another friendly formation instead of moving onto it', () => {
    useStore.getState().selectUnit('u1');
    const other = useStore.getState().game!.units.u2;
    useStore.getState().selectTile(other.tile);

    const next = useStore.getState();
    expect(next.selectedUnitId).toBe('u2');
    expect(next.game!.units.u1.tile).not.toBe(other.tile);
  });
});
