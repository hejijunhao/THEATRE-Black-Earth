// Bound-journal chronology. Pure read of notifications — no rules.

import { NotificationEntry } from '../game/types';

export interface ChronoLine {
  id: number;
  turn: number;
  kind: NotificationEntry['kind'];
  text: string;
  atk?: number;
  def?: number;
}

export interface ChronoWeek {
  turn: number;
  lines: ChronoLine[];
}

const DICE_RE = /2d6\s+(\d+)(?:[–-](\d+)| vs (\d+))?/;

export function parseDice(text: string): { atk?: number; def?: number } {
  const m = text.match(DICE_RE);
  if (!m) return {};
  return {
    atk: Number(m[1]),
    def: m[2] || m[3] ? Number(m[2] ?? m[3]) : undefined,
  };
}

/** Newest week first. Keeps the last `limit` notifications, grouped by turn. */
export function bindChronology(notes: NotificationEntry[], limit = 10): ChronoWeek[] {
  const recent = notes.slice(-limit);
  const weeks = new Map<number, ChronoLine[]>();
  for (const n of recent) {
    const dice = n.kind === 'combat' ? parseDice(n.text) : {};
    const line: ChronoLine = {
      id: n.id,
      turn: n.turn,
      kind: n.kind,
      text: n.text,
      ...dice,
    };
    const bucket = weeks.get(n.turn) ?? [];
    bucket.push(line);
    weeks.set(n.turn, bucket);
  }
  return [...weeks.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([turn, lines]) => ({ turn, lines: lines.slice().reverse() }));
}
