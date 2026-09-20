// Rest-state HUD gate. Chrome is hierarchical: map first, then the strip,
// then one rail. Everything else waits for a selection or an explicit ask.
// No rules live here — only what the shell is allowed to mount.

export interface HudInspect {
  selectedUnitId: string | null;
  showJournal: boolean;
  showDossier: boolean;
  showTheatreClock: boolean;
  pinnedLexiconId: string | null;
  pendingAttackId: string | null;
  lastCombat: unknown;
  interactionMode: 'idle' | 'attack' | 'op-target' | 'deploy';
}

export function paperUp(s: Pick<HudInspect, 'pendingAttackId' | 'lastCombat'>): boolean {
  return Boolean(s.pendingAttackId || s.lastCombat);
}

/** Command bench mounts only for a selected formation (and stays through AAR). */
export function showCommandBench(s: Pick<HudInspect, 'selectedUnitId'>): boolean {
  return Boolean(s.selectedUnitId);
}

/** Journal is a book you open — never a permanent pane. */
export function showJournalPanel(s: HudInspect): boolean {
  return s.showJournal && !paperUp(s);
}

/** Side dossier / encyclopedia / targeting copy. Never auto-opens on select. */
export function showDossierPanel(s: HudInspect): boolean {
  if (s.pinnedLexiconId) return true;
  if (s.interactionMode === 'op-target' || s.interactionMode === 'deploy') return true;
  return s.showDossier;
}

/** Orders banner only when the bench cannot name the next act. */
export function showOrdersHint(s: HudInspect): boolean {
  if (paperUp(s)) return false;
  return s.interactionMode === 'op-target' || s.interactionMode === 'deploy';
}

export function showTheatreClockPanel(s: Pick<HudInspect, 'showTheatreClock'>): boolean {
  return s.showTheatreClock;
}

export function hudFrame(s: HudInspect): 'paper' | 'selected' | 'rest' {
  if (paperUp(s)) return 'paper';
  if (s.selectedUnitId) return 'selected';
  return 'rest';
}
