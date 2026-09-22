// Rest-frame outliner gate. The week-runner is a chip until a formation
// list is explicitly opened. Combat paper keeps just the Next chip. No rules live here.

import { HudInspect, paperUp } from './hudChrome';

export type OutlinerChrome = 'chip' | 'open' | 'rail';

export type OutlinerInspect = Pick<HudInspect, 'selectedUnitId' | 'pendingAttackId' | 'lastCombat'> & {
  showOutliner?: boolean;
};

/** Chip at rest. Full list only on explicit open. Compact chip through paper. */
export function outlinerChrome(s: OutlinerInspect): OutlinerChrome {
  if (paperUp(s)) return 'rail';
  if (s.showOutliner) return 'open';
  return 'chip';
}

export function outlinerListMounted(chrome: OutlinerChrome): boolean {
  return chrome === 'open';
}
