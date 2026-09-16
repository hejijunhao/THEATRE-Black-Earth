// Canvas-space projection of a hex. The combat paper docks from this
// point so the sheet tracks the fight, not a HUD quadrant. No rules.

export interface HexScreenPoint {
  tile: string;
  x: number;
  y: number;
  visible: boolean;
}

type Listener = (pt: HexScreenPoint | null) => void;

let current: HexScreenPoint | null = null;
const listeners = new Set<Listener>();

export function publishHexScreen(pt: HexScreenPoint | null): void {
  const same = current && pt
    && current.tile === pt.tile
    && current.visible === pt.visible
    && Math.abs(current.x - pt.x) < 0.75
    && Math.abs(current.y - pt.y) < 0.75;
  if (same || (!current && !pt)) return;
  current = pt;
  for (const listen of listeners) listen(pt);
}

export function subscribeHexScreen(listen: Listener): () => void {
  listeners.add(listen);
  listen(current);
  return () => { listeners.delete(listen); };
}

export function peekHexScreen(): HexScreenPoint | null {
  return current;
}
