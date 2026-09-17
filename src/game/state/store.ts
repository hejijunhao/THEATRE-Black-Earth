// Central store. Game rules stay in src/game/rules — this store is a thin
// dispatcher that applies rule functions to the state via immer and holds
// transient UI state alongside.

import { create } from 'zustand';
import { produce } from 'immer';
import { aiTurnDone, planAIQueue, stepAI } from '../ai/ai';
import { UNIT_DEFS, TERRAIN_DEFS } from '../data/defs';
import { computePreview, describeEngagement, resolveBombardment, resolveCombat } from '../rules/combat';
import { recomputeFog } from '../rules/fog';
import { applyMove, attackableTargets, reachableTiles, unitOnTile } from '../rules/movement';
import { applyOperation, canUseOperation, validateOpTarget } from '../rules/ops';
import { applyEventEffects } from '../rules/events';
import {
  deployReserve,
  endTurnWarnings,
  noteCityCapture,
  noteUnitDestroyed,
  pushNote,
  resolveGlobalTurn,
} from '../rules/turn';
import { autosave, loadAutosave, loadSlot, saveSlot } from './save';
import { buildInitialState } from '../scenarios/build';
import {
  AIActionLog,
  CombatResult,
  FactionId,
  GameState,
  OperationId,
  TileId,
} from '../types';

export type MapMode = 'political' | 'supply' | 'terrain' | 'objectives' | 'intel';
export type InteractionMode = 'idle' | 'attack' | 'op-target' | 'deploy';
export type Screen = 'menu' | 'game';

export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
}

interface StoreState {
  game: GameState | null;
  screen: Screen;
  mapMode: MapMode;
  selectedUnitId: string | null;
  selectedTileId: TileId | null;
  hoveredTileId: TileId | null;
  interactionMode: InteractionMode;
  pendingOp: OperationId | null;
  pendingReserveId: string | null;
  pendingAttackId: string | null; // enemy unit id awaiting attack confirmation
  lastCombat: CombatResult | null;
  lastAILog: AIActionLog | null;
  /** Encyclopedia: last hovered term; pinned term on the side ledger. */
  hoverLexiconId: string | null;
  lastLexiconId: string | null;
  pinnedLexiconId: string | null;
  /** On-demand chrome. Closed at rest — the map is the hero. */
  showJournal: boolean;
  showDossier: boolean;
  showTheatreClock: boolean;
  aiSpeed: number;
  cameraFocus: { tile: TileId; seq: number } | null;
  endTurnWarningsList: string[] | null;
  audio: AudioSettings;
  showSettings: boolean;
  tutorialEnabled: boolean;

  // lifecycle
  newCampaign: (faction: FactionId, tutorial: boolean, fixedSeed?: number) => void;
  continueCampaign: () => void;
  loadFromSlot: (n: number) => void;
  saveToSlot: (n: number) => void;
  toMenu: () => void;

  // selection & interaction
  selectTile: (tile: TileId | null) => void;
  selectUnit: (unitId: string | null) => void;
  hoverTile: (tile: TileId | null) => void;
  setMapMode: (mode: MapMode) => void;
  setInteractionMode: (mode: InteractionMode) => void;
  focusCamera: (tile: TileId) => void;

  // orders
  setPendingAttack: (unitId: string | null) => void;
  orderMove: (dest: TileId) => void;
  orderAttack: (defenderId: string) => void;
  toggleReinforce: () => void;
  orderEntrench: () => void;
  beginOperation: (op: OperationId) => void;
  applyOperationAt: (tile: TileId) => void;
  beginDeploy: (reserveId: string) => void;
  applyDeployAt: (tile: TileId) => void;
  cancelInteraction: () => void;
  dismissCombat: () => void;
  hoverLexicon: (id: string | null) => void;
  pinLexicon: (id: string | null) => void;
  toggleJournal: () => void;
  toggleDossier: () => void;
  toggleTheatreClock: () => void;
  setShowJournal: (show: boolean) => void;
  setShowDossier: (show: boolean) => void;
  setShowTheatreClock: (show: boolean) => void;

  // events & turn flow
  chooseEventOption: (index: number) => void;
  requestEndTurn: () => void;
  confirmEndTurn: () => void;
  cancelEndTurn: () => void;
  aiStep: () => void;
  setAISpeed: (ms: number) => void;

  // tutorial
  advanceTutorial: (fromStep: number) => void;
  skipTutorial: () => void;

  // settings
  setAudio: (patch: Partial<AudioSettings>) => void;
  setShowSettings: (show: boolean) => void;
  quality: 'high' | 'low';
  setQuality: (q: 'high' | 'low') => void;
  // Force counter plates at any zoom (Tab). Persisted — wargamers who want
  // the board game keep it.
  counterMode: boolean;
  setCounterMode: (on: boolean) => void;
  toggleCounterMode: () => void;
  // Menu backdrop: put a throwaway campaign in state so the main menu sits
  // over the live map (v2-vision §7.2). Never autosaved.
  ensureMenuBackdrop: () => void;
}

function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem('tbe-audio');
    if (raw) return JSON.parse(raw);
  } catch { /* default below */ }
  return { master: 0.7, music: 0.5, sfx: 0.7, muted: false };
}

export const useStore = create<StoreState>((set, get) => {
  // Apply a mutation to the game state via immer; no-op when no game.
  const mutate = (fn: (draft: GameState) => void) => {
    const game = get().game;
    if (!game) return;
    set({ game: produce(game, fn) });
  };

  return {
    game: null,
    screen: 'menu',
    mapMode: 'terrain',
    selectedUnitId: null,
    selectedTileId: null,
    hoveredTileId: null,
    interactionMode: 'idle',
    pendingOp: null,
    pendingReserveId: null,
    pendingAttackId: null,
    lastCombat: null,
    lastAILog: null,
    hoverLexiconId: null,
    lastLexiconId: null,
    pinnedLexiconId: null,
    showJournal: false,
    showDossier: false,
    showTheatreClock: false,
    aiSpeed: 900,
    cameraFocus: null,
    endTurnWarningsList: null,
    audio: loadAudioSettings(),
    showSettings: false,
    quality: (localStorage.getItem('tbe-quality') as 'high' | 'low') ?? 'high',
    counterMode: localStorage.getItem('tbe-counters') === '1',
    tutorialEnabled: true,

    newCampaign: (faction, tutorial, fixedSeed) => {
      const seed = fixedSeed !== undefined ? fixedSeed >>> 0 : (Date.now() % 2147483647) >>> 0;
      const state = buildInitialState(faction, seed);
      state.tutorialStep = tutorial ? 0 : -1;
      pushNote(state, 'info', `Campaign begins — ${state.scenario.dateLabel}.`);
      autosave(state);
      set({
        game: state,
        screen: 'game',
        mapMode: 'terrain',
        selectedUnitId: null,
        selectedTileId: null,
        interactionMode: 'idle',
        lastCombat: null,
        lastAILog: null,
        tutorialEnabled: tutorial,
        cameraFocus: null,
        showJournal: false,
        showDossier: false,
        showTheatreClock: false,
        pinnedLexiconId: null,
      });
    },

    continueCampaign: () => {
      const state = loadAutosave();
      if (!state) return;
      set({
        game: state,
        screen: 'game',
        selectedUnitId: null,
        selectedTileId: null,
        interactionMode: 'idle',
        lastCombat: null,
        lastAILog: null,
        showJournal: false,
        showDossier: false,
        showTheatreClock: false,
        pinnedLexiconId: null,
      });
    },

    loadFromSlot: (n) => {
      const state = loadSlot(n);
      if (!state) return;
      set({
        game: state,
        screen: 'game',
        selectedUnitId: null,
        selectedTileId: null,
        interactionMode: 'idle',
        lastCombat: null,
        lastAILog: null,
        showJournal: false,
        showDossier: false,
        showTheatreClock: false,
        pinnedLexiconId: null,
      });
    },

    saveToSlot: (n) => {
      const game = get().game;
      if (game) saveSlot(n, game);
      set({}); // trigger subscribers (slot list refresh)
    },

    toMenu: () => {
      const game = get().game;
      if (game && game.phase !== 'ended') autosave(game);
      set({ screen: 'menu' });
    },

    selectTile: (tile) => {
      const { game, interactionMode } = get();
      if (!game) return;
      if (interactionMode === 'op-target') {
        get().applyOperationAt(tile as TileId);
        return;
      }
      if (interactionMode === 'deploy') {
        get().applyDeployAt(tile as TileId);
        return;
      }
      if (tile === null) {
        set({
          selectedTileId: null,
          selectedUnitId: null,
          interactionMode: 'idle',
          pendingAttackId: null,
          showDossier: false,
        });
        return;
      }
      const unit = unitOnTile(game, tile);
      if (unit && unit.faction === game.playerFaction && game.phase === 'player') {
        set({ selectedUnitId: unit.id, selectedTileId: tile, interactionMode: 'idle', pendingAttackId: null });
        return;
      }
      // Clicking an adjacent enemy with a friendly unit selected opens the
      // combat preview for confirmation.
      const { selectedUnitId } = get();
      if (unit && selectedUnitId && game.phase === 'player') {
        const attacker = game.units[selectedUnitId];
        if (attacker && attackableTargets(game, attacker).some((t) => t.id === unit.id)) {
          set({ pendingAttackId: unit.id, selectedTileId: tile });
          return;
        }
      }
      // Highlighted legal march hex → order. Must run before the empty-hex
      // fallthrough or the reach wash is a no-op (or drops the selection).
      if (!unit && selectedUnitId && game.phase === 'player') {
        const mover = game.units[selectedUnitId];
        if (mover && mover.faction === game.playerFaction && reachableTiles(game, mover).has(tile)) {
          get().orderMove(tile);
          return;
        }
      }
      set({
        selectedTileId: tile,
        selectedUnitId: null,
        interactionMode: 'idle',
        pendingAttackId: null,
        showDossier: false,
      });
    },

    setPendingAttack: (unitId) => set({ pendingAttackId: unitId }),

    selectUnit: (unitId) => {
      const game = get().game;
      if (!game || !unitId) {
        set({ selectedUnitId: null, showDossier: false });
        return;
      }
      const unit = game.units[unitId];
      if (unit) set({ selectedUnitId: unitId, selectedTileId: unit.tile, interactionMode: 'idle' });
    },

    hoverTile: (tile) => set({ hoveredTileId: tile }),
    setMapMode: (mode) => set({ mapMode: mode }),
    setInteractionMode: (mode) => set({ interactionMode: mode }),
    focusCamera: (tile) => set((s) => ({ cameraFocus: { tile, seq: (s.cameraFocus?.seq ?? 0) + 1 } })),

    orderMove: (dest) => {
      const { game, selectedUnitId } = get();
      if (!game || !selectedUnitId || game.phase !== 'player') return;
      let captured: TileId[] = [];
      const next = produce(game, (draft) => {
        captured = applyMove(draft, selectedUnitId, dest);
        for (const t of captured) {
          const cityId = draft.tiles[t].cityId;
          if (cityId) noteCityCapture(draft, cityId, draft.playerFaction);
        }
        recomputeFog(draft);
      });
      set({ game: next, selectedTileId: dest, pendingAttackId: null });
    },

    orderAttack: (defenderId) => {
      const { game, selectedUnitId } = get();
      if (!game || !selectedUnitId || game.phase !== 'player') return;
      const attacker = game.units[selectedUnitId];
      const defender = game.units[defenderId];
      if (!attacker || !defender) return;
      const isArtillery = UNIT_DEFS[attacker.type].support > 0;
      let result: CombatResult | null = null;
      const next = produce(game, (draft) => {
        const defenderRef = draft.units[defenderId];
        const resolved = isArtillery
          ? resolveBombardment(draft, selectedUnitId, defenderId)
          : resolveCombat(draft, selectedUnitId, defenderId);
        result = resolved;
        if (resolved.defenderDestroyed && defenderRef) noteUnitDestroyed(draft, defenderRef);
        if (resolved.tileCaptured) {
          const cityId = draft.tiles[resolved.tile].cityId;
          if (cityId) noteCityCapture(draft, cityId, draft.playerFaction);
        }
        pushNote(draft, 'combat', describeEngagement(resolved));
        recomputeFog(draft);
      });
      set({ game: next, lastCombat: result, interactionMode: 'idle', pendingAttackId: null });
    },

    toggleReinforce: () => {
      const { selectedUnitId } = get();
      if (!selectedUnitId) return;
      mutate((draft) => {
        const unit = draft.units[selectedUnitId];
        if (!unit) return;
        unit.reinforcing = !unit.reinforcing;
        if (unit.reinforcing) {
          pushNote(draft, 'reinforce', `${unit.name} begins receiving replacements.`);
        }
      });
    },

    orderEntrench: () => {
      const { selectedUnitId } = get();
      if (!selectedUnitId) return;
      mutate((draft) => {
        const unit = draft.units[selectedUnitId];
        if (!unit || unit.movement <= 0) return;
        const tile = draft.tiles[unit.tile];
        const cap = Math.min(4, TERRAIN_DEFS[tile.terrain].entrenchCap + (tile.fortified ? 1 : 0));
        unit.movement = 0;
        if (unit.entrenchment < cap) unit.entrenchment += 1;
      });
    },

    beginOperation: (op) => {
      const game = get().game;
      if (!game || game.phase !== 'player') return;
      const check = canUseOperation(game, game.playerFaction, op);
      if (!check.ok) return;
      set({ pendingOp: op, interactionMode: 'op-target' });
    },

    applyOperationAt: (tile) => {
      const { game, pendingOp } = get();
      if (!game || !pendingOp) return;
      const valid = validateOpTarget(game, game.playerFaction, pendingOp, tile);
      if (!valid.ok) {
        set({ interactionMode: 'idle', pendingOp: null });
        return;
      }
      const next = produce(game, (draft) => {
        const msg = applyOperation(draft, draft.playerFaction, pendingOp, tile);
        pushNote(draft, 'info', msg);
        recomputeFog(draft);
      });
      set({ game: next, pendingOp: null, interactionMode: 'idle' });
    },

    beginDeploy: (reserveId) => {
      set({ pendingReserveId: reserveId, interactionMode: 'deploy' });
    },

    applyDeployAt: (tile) => {
      const { game, pendingReserveId } = get();
      if (!game || !pendingReserveId) return;
      const next = produce(game, (draft) => {
        const unit = deployReserve(draft, draft.playerFaction, pendingReserveId, tile);
        if (unit) {
          pushNote(draft, 'reinforce', `${unit.name} deploys to the theatre.`);
          recomputeFog(draft);
        }
      });
      set({ game: next, pendingReserveId: null, interactionMode: 'idle' });
    },

    cancelInteraction: () => set({ interactionMode: 'idle', pendingOp: null, pendingReserveId: null, pendingAttackId: null }),
    dismissCombat: () => set({ lastCombat: null }),
    hoverLexicon: (id) => set(id
      ? { hoverLexiconId: id, lastLexiconId: id }
      : { hoverLexiconId: null }),
    pinLexicon: (id) => set({ pinnedLexiconId: id }),
    toggleJournal: () => set((s) => ({ showJournal: !s.showJournal })),
    toggleDossier: () => set((s) => ({ showDossier: !s.showDossier })),
    toggleTheatreClock: () => set((s) => ({ showTheatreClock: !s.showTheatreClock })),
    setShowJournal: (show) => set({ showJournal: show }),
    setShowDossier: (show) => set({ showDossier: show }),
    setShowTheatreClock: (show) => set({ showTheatreClock: show }),

    chooseEventOption: (index) => {
      mutate((draft) => {
        const event = draft.pendingEvent;
        if (!event) return;
        const option = event.options[index];
        if (option) {
          applyEventEffects(draft, option.effects);
          pushNote(draft, 'event', `${event.title}: ${option.label}.`);
        }
        draft.pendingEvent = null;
      });
    },

    requestEndTurn: () => {
      const game = get().game;
      if (!game || game.phase !== 'player') return;
      const warnings = endTurnWarnings(game);
      if (warnings.length > 0) {
        set({ endTurnWarningsList: warnings });
      } else {
        get().confirmEndTurn();
      }
    },

    confirmEndTurn: () => {
      const game = get().game;
      if (!game || game.phase !== 'player') return;
      const next = produce(game, (draft) => {
        draft.phase = 'ai';
        draft.aiQueue = planAIQueue(draft);
        draft.aiIndex = 0;
      });
      set({
        game: next,
        endTurnWarningsList: null,
        selectedUnitId: null,
        interactionMode: 'idle',
        lastCombat: null,
        showDossier: false,
        showTheatreClock: false,
      });
    },

    cancelEndTurn: () => set({ endTurnWarningsList: null }),

    aiStep: () => {
      const game = get().game;
      if (!game || game.phase !== 'ai') return;
      let log: AIActionLog | null = null;
      let next = produce(game, (draft) => {
        log = stepAI(draft);
      });
      if (log !== null) {
        const focus = (log as AIActionLog).focusTile;
        set({
          game: next,
          lastAILog: log,
          ...(focus ? { cameraFocus: { tile: focus, seq: (get().cameraFocus?.seq ?? 0) + 1 } } : {}),
        });
        return;
      }
      // Queue exhausted: run global resolution and hand back control.
      if (aiTurnDone(next)) {
        next = produce(next, (draft) => {
          resolveGlobalTurn(draft);
        });
        autosave(next);
        set({ game: next, lastAILog: null });
      }
    },

    setAISpeed: (ms) => set({ aiSpeed: ms }),

    advanceTutorial: (fromStep) => {
      mutate((draft) => {
        if (draft.tutorialStep === fromStep) draft.tutorialStep = fromStep + 1;
      });
    },

    skipTutorial: () => {
      mutate((draft) => {
        draft.tutorialStep = -1;
      });
    },

    setAudio: (patch) => {
      const audio = { ...get().audio, ...patch };
      try {
        localStorage.setItem('tbe-audio', JSON.stringify(audio));
      } catch { /* non-fatal */ }
      set({ audio });
    },

    setShowSettings: (show) => set({ showSettings: show }),
    setQuality: (q) => {
      localStorage.setItem('tbe-quality', q);
      set({ quality: q });
    },
    setCounterMode: (on) => {
      localStorage.setItem('tbe-counters', on ? '1' : '0');
      set({ counterMode: on });
    },
    toggleCounterMode: () => {
      get().setCounterMode(!get().counterMode);
    },
    ensureMenuBackdrop: () => {
      if (get().game) return;
      const backdrop = buildInitialState('UA', 20250301);
      backdrop.tutorialStep = -1;
      set({ game: backdrop });
    },
  };
});

// Convenience selectors used by several components.
export function usePlayerFaction(): FactionId | null {
  return useStore((s) => s.game?.playerFaction ?? null);
}

export function useSelectedUnit() {
  return useStore((s) => {
    if (!s.game || !s.selectedUnitId) return null;
    return s.game.units[s.selectedUnitId] ?? null;
  });
}

export { computePreview, attackableTargets };
