// Canvas-generated textures: unit counters (NATO-inspired symbols) and city
// labels. Everything is drawn locally — no external assets or fonts.

import * as THREE from 'three';
import { CitySize, SupplyState, UnitType } from '../game/types';

const MONO = '600 __px "IBM Plex Mono", ui-monospace, Menlo, monospace';
const SANS = '__wt __px "Inter", system-ui, sans-serif';

function font(template: string, px: number, weight = 600): string {
  return template.replace('__wt', String(weight)).replace('__px', String(px));
}

export interface CounterSpec {
  type: UnitType;
  faction: 'UA' | 'RU';
  name: string;
  strength: number;    // 0..100
  supply: SupplyState;
  entrenchment: number;
  reinforcing: boolean;
  disorganized: boolean;
  selected: boolean;
  ghost: boolean;      // outdated intel marker
  intelLevel?: number; // for enemy ghosts: 1..4
  /** Remaining MP this week (player only). Hidden on enemy / ghosts. */
  movement?: number;
  movementMax?: number;
  /** No MP left this week — dim the plate. */
  spent?: boolean;
  /** Already assaulted or fired this week. */
  hasAttacked?: boolean;
  /** Legal adjacent enemy — amber contact ticks. */
  inContact?: boolean;
  /** Selected friendly can assault this counter. */
  threatened?: boolean;
}

export function counterKey(s: CounterSpec): string {
  return [
    s.type, s.faction, s.name, Math.round(s.strength / 5), s.supply,
    s.entrenchment, s.reinforcing, s.disorganized, s.selected, s.ghost, s.intelLevel ?? '',
    s.movement ?? '', s.movementMax ?? '', s.spent ? 1 : 0, s.hasAttacked ? 1 : 0,
    s.inContact ? 1 : 0, s.threatened ? 1 : 0,
  ].join('|');
}

const FACTION_BG: Record<'UA' | 'RU', string> = {
  UA: '#2c405e',
  RU: '#59302a',
};
const FACTION_EDGE: Record<'UA' | 'RU', string> = {
  UA: '#7fa8d0',
  RU: '#c08a76',
};

// Draw the NATO-style symbol for a unit type inside the given frame.
function drawSymbol(ctx: CanvasRenderingContext2D, type: UnitType, x: number, y: number, w: number, h: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  switch (type) {
    case 'infantry':
      // Crossed diagonals
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
      ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
      ctx.stroke();
      break;
    case 'mechanized': {
      // Infantry cross + track oval
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
      ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w * 0.42, h * 0.30, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'armored':
      // Track oval
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w * 0.44, h * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'artillery':
      // Filled dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'recon':
      // Single diagonal
      ctx.beginPath();
      ctx.moveTo(x, y + h); ctx.lineTo(x + w, y);
      ctx.stroke();
      break;
  }
}

const SUPPLY_COLOR: Record<SupplyState, string> = {
  full: '#7fae7a',
  supplied: '#7fae7a',
  strained: '#c9a352',
  low: '#c96f3b',
  isolated: '#b04a3a',
};

function mpLabel(mp: number): string {
  if (mp < 0.05) return '0';
  return Math.abs(mp - Math.round(mp)) < 0.05 ? String(Math.round(mp)) : mp.toFixed(1);
}

/** Agency box: remaining MP as a numeral, ATK if the formation has engaged. */
function drawMpBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  mp: number,
  spent: boolean,
  attacked: boolean,
): void {
  ctx.fillStyle = spent ? 'rgba(0, 0, 0, 0.4)' : 'rgba(201, 163, 82, 0.14)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = spent ? 'rgba(232, 226, 210, 0.28)' : '#c9a352';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = spent ? '#6d6858' : '#e8dfc8';
  ctx.font = font(MONO, Math.round(h * 0.52), 700);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mpLabel(mp), x + w / 2, y + h / 2 - (attacked ? h * 0.12 : 0));
  if (attacked) {
    ctx.fillStyle = '#c9a352';
    ctx.font = font(MONO, Math.max(10, Math.round(h * 0.22)), 700);
    ctx.fillText('ATK', x + w / 2, y + h - Math.max(8, h * 0.18));
  }
}

function drawCornerTicks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  const s = 18;
  const inset = 10;
  const corners: Array<[number, number, number, number, number, number]> = [
    [inset, inset + s, inset, inset, inset + s, inset],
    [w - inset - s, inset, w - inset, inset, w - inset, inset + s],
    [inset, h - inset - s, inset, h - inset, inset + s, h - inset],
    [w - inset - s, h - inset, w - inset, h - inset, w - inset, h - inset - s],
  ];
  for (const [ax, ay, bx, by, cx, cy] of corners) {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.stroke();
  }
}

// Renders a unit counter to a canvas texture (256x160).
export function makeCounterTexture(spec: CounterSpec): THREE.CanvasTexture {
  const w = 256;
  const h = 160;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const alpha = spec.ghost ? 0.55 : 1;
  ctx.globalAlpha = alpha;

  // Plate
  const bg = spec.spent ? (spec.faction === 'UA' ? '#1c2838' : '#3a201c') : FACTION_BG[spec.faction];
  const edge = spec.selected
    ? '#e8dfc8'
    : spec.threatened
      ? '#e8dfc8'
      : spec.inContact
        ? '#c9a352'
        : FACTION_EDGE[spec.faction];
  ctx.fillStyle = bg;
  ctx.strokeStyle = edge;
  ctx.lineWidth = spec.selected || spec.threatened ? 8 : spec.inContact ? 6 : 4;
  const r = 14;
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, h - 8, r);
  ctx.fill();
  ctx.stroke();
  if (spec.spent) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();
  }

  // Symbol frame
  const fx = 58;
  const fy = 18;
  const fw = 140;
  const fh = 74;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 5;
  ctx.strokeRect(fx, fy, fw, fh);

  if (spec.ghost && (spec.intelLevel ?? 0) < 2) {
    // Unknown formation: question mark instead of a symbol
    ctx.fillStyle = edge;
    ctx.font = font(MONO, 56);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', fx + fw / 2, fy + fh / 2 + 4);
  } else {
    drawSymbol(ctx, spec.type, fx + 24, fy + 12, fw - 48, fh - 24, spec.spent ? '#8a8474' : '#e8e2d2');
  }

  // Frame designation — short NATO read, not the full brigade title.
  ctx.fillStyle = spec.spent ? '#8a8474' : '#e8e2d2';
  ctx.font = font(MONO, 24, 700);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(abbreviate(spec.name, spec.type), w / 2, 118);

  // Strength bar
  if (!spec.ghost || (spec.intelLevel ?? 0) >= 3) {
    const bw = w - 60;
    const bx = 30;
    const by = 124;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(bx, by, bw, 12);
    const t = Math.max(0, Math.min(1, spec.strength / 100));
    ctx.fillStyle = t > 0.6 ? '#8fae72' : t > 0.35 ? '#c9a352' : '#b04a3a';
    ctx.fillRect(bx, by, bw * t, 12);
    ctx.strokeStyle = 'rgba(232,226,210,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, 12);
  }

  // Status pips (left column): supply, entrenchment, reinforcing/disorganized
  if (!spec.ghost) {
    ctx.fillStyle = SUPPLY_COLOR[spec.supply];
    ctx.beginPath();
    ctx.arc(30, 30, 9, 0, Math.PI * 2);
    ctx.fill();
    if (spec.entrenchment > 0) {
      ctx.strokeStyle = '#cfc9b8';
      ctx.lineWidth = 4;
      for (let i = 0; i < Math.min(spec.entrenchment, 4); i++) {
        ctx.beginPath();
        ctx.moveTo(20, 52 + i * 12);
        ctx.lineTo(40, 52 + i * 12);
        ctx.stroke();
      }
    }
    if (spec.reinforcing) {
      ctx.fillStyle = '#8fae72';
      ctx.font = font(MONO, 22, 700);
      ctx.textAlign = 'center';
      ctx.fillText('+', 30, 88);
    }
    if (spec.disorganized) {
      ctx.fillStyle = '#c9a352';
      ctx.font = font(MONO, 22, 700);
      ctx.textAlign = 'center';
      ctx.fillText('!', 30, spec.reinforcing ? 108 : 88);
    }
    if (spec.inContact) {
      drawCornerTicks(ctx, w, h, '#c9a352');
    } else if (spec.threatened) {
      drawCornerTicks(ctx, w, h, '#e8dfc8');
    }
    if (spec.movementMax != null && spec.movement != null) {
      drawMpBox(ctx, 198, 16, 46, 54, spec.movement, Boolean(spec.spent), Boolean(spec.hasAttacked));
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ---------------------------------------------------------------- standards
// The compact standard floating above a miniature (v2-vision §6.2): NATO
// symbol, abbreviated designation, strength pips, supply dot, experience
// chevrons. A distilled counter plate.

export interface StandardSpec {
  type: UnitType;
  faction: 'UA' | 'RU';
  name: string;
  tier: number;        // 1..4 (strength quarter)
  supply: SupplyState;
  experience: number;  // 0..3
  selected: boolean;
  movement?: number;
  movementMax?: number;
  spent?: boolean;
  hasAttacked?: boolean;
  inContact?: boolean;
  threatened?: boolean;
}

export function standardKey(s: StandardSpec): string {
  return [
    'std', s.type, s.faction, s.name, s.tier, s.supply, s.experience, s.selected,
    s.movement ?? '', s.movementMax ?? '', s.spent ? 1 : 0, s.hasAttacked ? 1 : 0,
    s.inContact ? 1 : 0, s.threatened ? 1 : 0,
  ].join('|');
}

// "92nd Mechanised Brigade" -> "92 MECH", "131st Reconnaissance…" -> "131 RECON"
export function abbreviate(name: string, type: UnitType): string {
  const num = name.match(/^(\d+)/)?.[1] ?? '';
  const kind =
    type === 'infantry' ? 'INF'
    : type === 'mechanized' ? 'MECH'
    : type === 'armored' ? 'TK'
    : type === 'artillery' ? 'ARTY'
    : 'RECON';
  return num ? `${num} ${kind}` : kind;
}

export function makeStandardTexture(spec: StandardSpec): THREE.CanvasTexture {
  const w = 256;
  const h = 84;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const bg = spec.spent ? (spec.faction === 'UA' ? '#1c2838' : '#3a201c') : FACTION_BG[spec.faction];
  const edge = spec.selected
    ? '#e8dfc8'
    : spec.threatened
      ? '#e8dfc8'
      : spec.inContact
        ? '#c9a352'
        : FACTION_EDGE[spec.faction];
  ctx.fillStyle = bg;
  ctx.strokeStyle = edge;
  ctx.lineWidth = spec.selected || spec.threatened ? 6 : spec.inContact ? 5 : 3;
  ctx.beginPath();
  ctx.roundRect(3, 3, w - 6, h - 6, 10);
  ctx.fill();
  ctx.stroke();
  if (spec.spent) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fill();
  }

  // NATO symbol, small, left
  drawSymbol(ctx, spec.type, 14, 20, 52, 42, spec.spent ? '#8a8474' : '#e8e2d2');

  // Abbreviated designation
  ctx.fillStyle = '#e2dcc8';
  ctx.font = font(MONO, 30, 700);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(abbreviate(spec.name, spec.type), 84, 34);

  // Strength pips (4 quarters)
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(96 + i * 26, 62, 7, 0, Math.PI * 2);
    if (i < spec.tier) {
      ctx.fillStyle = spec.tier > 2 ? '#8fae72' : spec.tier > 1 ? '#c9a352' : '#b04a3a';
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(226,220,200,0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Supply dot
  ctx.fillStyle = SUPPLY_COLOR[spec.supply];
  ctx.beginPath();
  ctx.arc(30, 66, 8, 0, Math.PI * 2);
  ctx.fill();

  // Experience chevrons
  if (spec.experience > 0) {
    ctx.strokeStyle = '#d8cf9a';
    ctx.lineWidth = 3;
    for (let i = 0; i < Math.min(3, spec.experience); i++) {
      const cx = 176;
      const cy = 16 + i * 12;
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy + 5);
      ctx.lineTo(cx, cy - 3);
      ctx.lineTo(cx + 9, cy + 5);
      ctx.stroke();
    }
  }

  if (spec.movementMax != null && spec.movement != null) {
    drawMpBox(ctx, 200, 12, 44, 60, spec.movement, Boolean(spec.spent), Boolean(spec.hasAttacked));
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// City label sprite texture.
export function makeLabelTexture(name: string, size: CitySize, faction: 'UA' | 'RU' | null): {
  texture: THREE.CanvasTexture;
  aspect: number;
} {
  const px = size === 'capital' ? 44 : size === 'major' ? 36 : 27;
  const weight = size === 'town' ? 500 : 600;
  const canvas = document.createElement('canvas');
  const ctx0 = canvas.getContext('2d')!;
  ctx0.font = font(SANS, px, weight);
  const textW = ctx0.measureText(name.toUpperCase()).width;
  canvas.width = Math.ceil(textW + 40);
  canvas.height = px + 26;
  const ctx = canvas.getContext('2d')!;

  ctx.font = font(SANS, px, weight);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  // Soft halo for readability against terrain
  ctx.shadowColor = 'rgba(20,20,16,0.9)';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(20,20,16,0.75)';
  ctx.strokeText(name.toUpperCase(), cx, cy);
  ctx.fillStyle = size === 'town' ? '#d8d2c0' : '#efe9d8';
  ctx.fillText(name.toUpperCase(), cx, cy);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: canvas.width / canvas.height };
}
