// View-side dock for combat paper. Prefers the contested hex's *screen*
// position so the sheet rides the fight. Tile-grid dock is a first-paint
// fallback only. No rules.

import { parseTileId, TileId } from '../game/types';

export type PaperSide = 'east' | 'west';
export type PaperBias = 'high' | 'mid' | 'low';

export interface PaperDock {
  side: PaperSide;
  yBias: PaperBias;
}

export interface PaperLayout {
  side: PaperSide;
  left: number;
  top: number;
  width: number;
  callout: { x1: number; y1: number; x2: number; y2: number };
}

/** 48×36 designed theatre — west hexes dock the sheet east, and vice versa. */
const COL_MID = 24;
const ROW_HIGH = 12;
const ROW_LOW = 24;

export const SHEET_WIDTH = 500;
export const SHEET_GAP = 34;

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

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function overlapsHex(
  left: number,
  top: number,
  w: number,
  h: number,
  hex: { x: number; y: number },
  pad: number,
): boolean {
  return hex.x > left - pad && hex.x < left + w + pad
    && hex.y > top - pad && hex.y < top + h + pad;
}

function place(
  side: PaperSide,
  hex: { x: number; y: number },
  width: number,
  height: number,
): { left: number; top: number } {
  return {
    left: side === 'east' ? hex.x + SHEET_GAP : hex.x - SHEET_GAP - width,
    top: hex.y - Math.min(86, height * 0.28),
  };
}

/** Pixel dock from the projected contested hex. Keeps the pulse uncovered. */
export function paperLayoutFromScreen(
  hex: { x: number; y: number },
  viewport: { w: number; h: number },
  sheet: { w: number; h: number },
): PaperLayout {
  const margin = { top: 62, right: 14, bottom: 128, left: 108 };
  const width = Math.min(sheet.w, Math.max(280, viewport.w - margin.left - margin.right));
  const height = Math.max(160, sheet.h);
  const prefer: PaperSide = hex.x < viewport.w * 0.5 ? 'east' : 'west';

  const fit = (side: PaperSide) => {
    const raw = place(side, hex, width, height);
    return {
      side,
      left: clamp(raw.left, margin.left, viewport.w - margin.right - width),
      top: clamp(raw.top, margin.top, viewport.h - margin.bottom - Math.min(height, 320)),
    };
  };

  let laid = fit(prefer);
  if (overlapsHex(laid.left, laid.top, width, height, hex, 18)) {
    const flipped = fit(prefer === 'east' ? 'west' : 'east');
    if (!overlapsHex(flipped.left, flipped.top, width, height, hex, 18)) laid = flipped;
  }

  const x2 = laid.side === 'east' ? laid.left : laid.left + width;
  const y2 = clamp(hex.y, laid.top + 28, laid.top + Math.min(height, 240) - 28);
  return {
    side: laid.side,
    left: laid.left,
    top: laid.top,
    width,
    callout: { x1: hex.x, y1: hex.y, x2, y2 },
  };
}
