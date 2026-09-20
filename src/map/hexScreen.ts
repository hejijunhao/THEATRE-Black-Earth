// Canvas-space projection of a hex. The combat paper docks from this
// point so the sheet tracks the fight, not a HUD quadrant. No rules.

export interface HexScreenPoint {
  tile: string;
  x: number;
  y: number;
  visible: boolean;
}

type Projector = (tile: string) => HexScreenPoint | null;

let projector: Projector | null = null;

export function setHexProjector(fn: Projector | null): void {
  projector = fn;
}

export function projectHex(tile: string): HexScreenPoint | null {
  return projector?.(tile) ?? null;
}
