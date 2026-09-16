// Application shell: screen routing, the AI-turn driver, keyboard shortcuts
// and audio wiring.

import { useEffect, useRef } from 'react';
import { audio } from './audio/audio';
import { attackableTargets as attackableTargetsForDebug } from './game/rules/movement';
import { tileWorldById } from './game/hex';
import { useStore } from './game/state/store';
import { MapScene } from './map/MapScene';
import { AIOverlay } from './ui/AIOverlay';
import { AssaultBriefing } from './ui/AssaultBriefing';
import { CommandBar, MapModes } from './ui/CommandBar';
import { OrdersHint } from './ui/OrdersHint';
import { Outliner } from './ui/Outliner';
import { MainMenu } from './ui/MainMenu';
import {
  CombatResultPanel,
  EndTurnDialog,
  EventModal,
  SettingsModal,
  VictoryScreen,
} from './ui/Modals';
import { AssetsView } from './ui/AssetsView';
import { Journal } from './ui/Journal';
import { Notifications } from './ui/Notifications';
import { SidePanel } from './ui/SidePanel';
import { TurnCard } from './ui/TurnCard';
import { TopBar } from './ui/TopBar';
import { Tutorial } from './ui/Tutorial';

function useAIDriver() {
  const phase = useStore((s) => s.game?.phase);
  const aiSpeed = useStore((s) => s.aiSpeed);
  const aiStep = useStore((s) => s.aiStep);
  const setAISpeed = useStore((s) => s.setAISpeed);
  const prevPhase = useRef(phase);

  useEffect(() => {
    if (phase !== 'ai') {
      // Restore the persisted AI speed after a one-off skip.
      if (prevPhase.current === 'ai') {
        const stored = Number(localStorage.getItem('tbe-aispeed') || 900);
        if (aiSpeed !== stored) setAISpeed(stored);
        audio.turn();
      }
      prevPhase.current = phase;
      return;
    }
    prevPhase.current = phase;
    const interval = setInterval(() => {
      aiStep();
    }, aiSpeed);
    return () => clearInterval(interval);
  }, [phase, aiSpeed, aiStep, setAISpeed]);
}

function useAudioWiring() {
  const audioSettings = useStore((s) => s.audio);

  // Start the engine on first user gesture; keep settings applied.
  useEffect(() => {
    const start = () => {
      audio.start();
      audio.applySettings(useStore.getState().audio);
    };
    window.addEventListener('pointerdown', start, { once: true });
    return () => window.removeEventListener('pointerdown', start);
  }, []);

  useEffect(() => {
    audio.applySettings(audioSettings);
  }, [audioSettings]);

  // Sound cues from state transitions.
  useEffect(() => {
    let prevCombatSeq: unknown = null;
    let prevSelected: string | null = null;
    let prevNoteCount = 0;
    let prevWeather: string | null = null;
    let prevMode: string | null = null;
    let prevEvent = false;
    return useStore.subscribe((s) => {
      if (s.lastCombat && s.lastCombat !== prevCombatSeq) {
        prevCombatSeq = s.lastCombat;
        audio.combat();
      }
      if (s.selectedUnitId && s.selectedUnitId !== prevSelected) {
        audio.select();
      }
      prevSelected = s.selectedUnitId;
      const notes = s.game?.notifications.length ?? 0;
      if (notes > prevNoteCount && prevNoteCount > 0) {
        const latest = s.game!.notifications[notes - 1];
        if (latest.kind === 'capture') audio.capture();
        else if (latest.kind === 'warning') audio.alert();
      }
      prevNoteCount = notes;
      // Weather bed follows the theatre.
      const weather = s.game?.weather ?? null;
      if (weather && weather !== prevWeather) {
        audio.setWeather(weather);
        prevWeather = weather;
      }
      // Map-table foley: switch tick on mode change, paper on briefings.
      if (prevMode !== null && s.mapMode !== prevMode) audio.switchTick();
      prevMode = s.mapMode;
      const hasEvent = Boolean(s.game?.pendingEvent);
      if (hasEvent && !prevEvent) audio.paper();
      prevEvent = hasEvent;
    });
  }, []);
}

function useKeyboard() {
  const cancelInteraction = useStore((s) => s.cancelInteraction);
  const selectTile = useStore((s) => s.selectTile);
  const requestEndTurn = useStore((s) => s.requestEndTurn);
  const setShowSettings = useStore((s) => s.setShowSettings);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const s = useStore.getState();
        if (s.showSettings) setShowSettings(false);
        else if (s.lastCombat) s.dismissCombat();
        else if (s.interactionMode !== 'idle' || s.pendingAttackId) cancelInteraction();
        else selectTile(null);
      } else if (e.key === 'Enter' && e.shiftKey) {
        requestEndTurn();
      } else if (e.key === 'Tab') {
        // Manual counter-mode override (v2-vision §6.3).
        e.preventDefault();
        useStore.getState().toggleCounterMode();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancelInteraction, selectTile, requestEndTurn, setShowSettings]);
}

// Persist AI speed choices made in settings.
function useAISpeedPersistence() {
  const aiSpeed = useStore((s) => s.aiSpeed);
  const phase = useStore((s) => s.game?.phase);
  useEffect(() => {
    // Only persist deliberate (non-skip) choices, made outside the AI phase.
    if (phase !== 'ai') {
      localStorage.setItem('tbe-aispeed', String(aiSpeed));
    }
  }, [aiSpeed, phase]);
}

// Debug/automation hook: lets headless tests drive the game deterministically.
function useDebugHook() {
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__TBE_DEBUG__ = {
      // Deterministic campaign start for the golden-image harness.
      newGame: (faction: 'UA' | 'RU', seed: number) =>
        useStore.getState().newCampaign(faction, false, seed),
      setMapMode: (mode: 'political' | 'supply' | 'terrain' | 'objectives' | 'intel') =>
        useStore.getState().setMapMode(mode),
      selectUnit: (id: string) => useStore.getState().selectUnit(id),
      attackTargets: () => {
        const s = useStore.getState();
        if (!s.game || !s.selectedUnitId) return [];
        const unit = s.game.units[s.selectedUnitId];
        if (!unit) return [];
        // Lazy import avoided: attackableTargets re-exported from store module.
        return attackableTargetsForDebug(s.game, unit).map((u) => u.id);
      },
      pendingAttack: (id: string) => useStore.getState().setPendingAttack(id),
      attack: (id: string) => useStore.getState().orderAttack(id),
      move: (dest: string) => useStore.getState().orderMove(dest),
      endTurn: () => useStore.getState().requestEndTurn(),
      confirmEndTurn: () => useStore.getState().confirmEndTurn(),
      setAISpeed: (ms: number) => useStore.getState().setAISpeed(ms),
      // Roster + camera focus, so visual harnesses can aim at a real
      // formation instead of guessing at world coordinates. World positions
      // come from tileWorldById so the hex maths stays in one place.
      units: () => {
        const s = useStore.getState();
        if (!s.game) return [];
        return Object.values(s.game.units).map((u) => ({
          id: u.id,
          type: u.type,
          faction: u.faction,
          tile: u.tile,
          strength: u.strength,
          ...tileWorldById(u.tile),
        }));
      },
      focusCamera: (tile: string) => useStore.getState().focusCamera(tile),
      summary: () => {
        const s = useStore.getState();
        if (!s.game) return null;
        const units = Object.values(s.game.units);
        return {
          turn: s.game.turn,
          phase: s.game.phase,
          weather: s.game.weather,
          ua: units.filter((u) => u.faction === 'UA').length,
          ru: units.filter((u) => u.faction === 'RU').length,
          selected: s.selectedUnitId,
          selectedTile: s.selectedTileId,
          notifications: s.game.notifications.slice(-5).map((n) => n.text),
          result: s.game.result,
          lastCombat: s.lastCombat
            ? {
                kind: s.lastCombat.kind,
                attacker: s.lastCombat.attackerName,
                defender: s.lastCombat.defenderName,
                attackerRoll: s.lastCombat.attackerRoll.total,
                defenderRoll: s.lastCombat.defenderRoll?.total ?? null,
                attackerLoss: s.lastCombat.attackerLoss,
                defenderLoss: s.lastCombat.defenderLoss,
                verdict: s.lastCombat.resolvedVerdict,
                tileCaptured: s.lastCombat.tileCaptured,
              }
            : null,
        };
      },
    };
    return () => {
      delete w.__TBE_DEBUG__;
    };
  }, []);
}

export default function App() {
  const screen = useStore((s) => s.screen);
  useAIDriver();
  useAudioWiring();
  useKeyboard();
  useAISpeedPersistence();
  useDebugHook();

  // Dev-only asset review route (v2-vision §8).
  if (window.location.hash === '#assets') {
    return <AssetsView />;
  }

  if (screen === 'menu') {
    return (
      <div className="app-root">
        <MapScene />
        <MainMenu />
        <SettingsModal />
      </div>
    );
  }

  return (
    <div className="app-root">
      <MapScene />
      <div className="hud">
        <TopBar />
        <Outliner />
        <SidePanel />
        <CommandBar />
        <OrdersHint />
        <MapModes />
        <Notifications />
        <AIOverlay />
        <AssaultBriefing />
        <CombatResultPanel />
        <EventModal />
        <EndTurnDialog />
        <SettingsModal />
        <Journal />
        <TurnCard />
        <Tutorial />
        <VictoryScreen />
      </div>
    </div>
  );
}
