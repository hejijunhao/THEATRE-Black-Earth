// Application shell: screen routing, the AI-turn driver, keyboard shortcuts
// and audio wiring.

import { useEffect, useRef } from 'react';
import { audio } from './audio/audio';
import { attackableTargets as attackableTargetsForDebug } from './game/rules/movement';
import { useStore } from './game/state/store';
import { MapScene } from './map/MapScene';
import { AIOverlay } from './ui/AIOverlay';
import { CommandBar, MapModes } from './ui/CommandBar';
import { MainMenu } from './ui/MainMenu';
import {
  CombatResultPanel,
  EndTurnDialog,
  EventModal,
  SettingsModal,
  VictoryScreen,
} from './ui/Modals';
import { Notifications } from './ui/Notifications';
import { SidePanel } from './ui/SidePanel';
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
        else if (s.interactionMode !== 'idle' || s.pendingAttackId) cancelInteraction();
        else selectTile(null);
      } else if (e.key === 'Enter' && e.shiftKey) {
        requestEndTurn();
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
          notifications: s.game.notifications.slice(-5).map((n) => n.text),
          result: s.game.result,
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

  if (screen === 'menu') {
    return (
      <div className="app-root">
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
        <SidePanel />
        <CommandBar />
        <MapModes />
        <Notifications />
        <AIOverlay />
        <CombatResultPanel />
        <EventModal />
        <EndTurnDialog />
        <SettingsModal />
        <Tutorial />
        <VictoryScreen />
      </div>
    </div>
  );
}
