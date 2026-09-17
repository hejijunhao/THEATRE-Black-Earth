// Rest-frame outliner gate. The week-runner is a chip until a formation
// is selected or the player asks for the list. Combat paper keeps the
// existing thin rail. No rules live here.

import { HudInspect, paperUp } from './hudChrome';

export type OutlinerChrome = 'chip' | 'open' | 'rail';

export type OutlinerInspect = Pick<HudInspect, 'selectedUnitId' | 'pendingAttackId' | 'lastCombat'> & {
  showOutliner?: boolean;
};

/** Chip at rest. Full list on select or explicit open. Rail through paper. */
export function outlinerChrome(s: OutlinerInspect): OutlinerChrome {
  if (paperUp(s)) return 'rail';
  if (s.selectedUnitId || s.showOutliner) return 'open';
  return 'chip';
}

export function outlinerListMounted(chrome: OutlinerChrome): boolean {
  return chrome !== 'chip';
}
