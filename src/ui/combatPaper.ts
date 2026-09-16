// View-side dock for combat paper. Odd-r tile → which side of the HUD
// the sheet occupies so the contested hex stays on the map. No rules.

import { parseTileId, TileId } from '../game/types';

export type PaperSide = 'east' | 'west';
export type PaperBias = 'high' | 'mid' | 'low';

export interface PaperDock {
  side: PaperSide;
  yBias: PaperBias;
}

/** 48×36 designed theatre — west hexes dock the sheet east, and vice versa. */
const COL_MID = 24;
const ROW_HIGH = 12;
const ROW_LOW = 24;

export function paperDock(tile: TileId): PaperDock {
  const { x, y } = parseTileId(tile);
  return {
    side: x < COL_MID ? 'east' : 'west',
    yBias: y < ROW_HIGH ? 'low' : y > ROW_LOW ? 'high' : 'mid',
  };
}

export function paperOverClass(tile: TileId): string {
  const d = paperDock(tile);
  return `brief-over dock-${d.side} bias-${d.yBias}`;
}
