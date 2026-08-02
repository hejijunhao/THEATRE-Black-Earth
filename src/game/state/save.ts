// Save format: versioned JSON snapshots of the entire GameState in
// localStorage. One autosave plus three manual slots.

import { GameState, SAVE_VERSION } from '../types';

const AUTOSAVE_KEY = 'tbe-autosave';
const SLOT_KEY = (n: number) => `tbe-save-${n}`;
export const SLOT_COUNT = 3;

export interface SaveHeader {
  version: number;
  savedAt: string;
  label: string;
  turn: number;
  faction: string;
}

interface SaveFile extends SaveHeader {
  state: GameState;
}

function write(key: string, state: GameState, label: string): void {
  const file: SaveFile = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    label,
    turn: state.turn,
    faction: state.playerFaction,
    state,
  };
  try {
    localStorage.setItem(key, JSON.stringify(file));
  } catch (err) {
    console.warn('Save failed', err);
  }
}

function read(key: string): SaveFile | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const file = JSON.parse(raw) as SaveFile;
    if (file.version !== SAVE_VERSION) return null; // incompatible save
    return file;
  } catch {
    return null;
  }
}

export function autosave(state: GameState): void {
  write(AUTOSAVE_KEY, state, `Autosave · Turn ${state.turn}`);
}

export function loadAutosave(): GameState | null {
  return read(AUTOSAVE_KEY)?.state ?? null;
}

export function hasAutosave(): boolean {
  return read(AUTOSAVE_KEY) !== null;
}

export function autosaveHeader(): SaveHeader | null {
  const f = read(AUTOSAVE_KEY);
  return f ? { version: f.version, savedAt: f.savedAt, label: f.label, turn: f.turn, faction: f.faction } : null;
}

export function saveSlot(n: number, state: GameState): void {
  write(SLOT_KEY(n), state, `Turn ${state.turn}`);
}

export function loadSlot(n: number): GameState | null {
  return read(SLOT_KEY(n))?.state ?? null;
}

export function slotHeaders(): Array<SaveHeader | null> {
  return Array.from({ length: SLOT_COUNT }, (_, i) => {
    const f = read(SLOT_KEY(i));
    return f ? { version: f.version, savedAt: f.savedAt, label: f.label, turn: f.turn, faction: f.faction } : null;
  });
}

export function deleteSlot(n: number): void {
  localStorage.removeItem(SLOT_KEY(n));
}
