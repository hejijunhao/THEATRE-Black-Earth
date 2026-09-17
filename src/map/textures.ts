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
  /** Hex-adjacent to an enemy (even if spent). */
  inContact?: boolean;
  /** Legal assault/fires this week — gold blade. */
  canAttack?: boolean;
  /** Selected friendly can assault this counter. */
  threatened?: boolean;
}

export function counterKey(s: CounterSpec): string {
  return [
    s.type, s.faction, s.name, Math.round(s.strength / 5), s.supply,
    s.entrenchment, s.reinforcing, s.disorganized, s.selected, s.ghost, s.intelLevel ?? '',
    s.movement ?? '', s.movementMax ?? '', s.spent ? 1 : 0, s.hasAttacked ? 1 : 0,
    s.inContact ? 1 : 0, s.canAttack ? 1 : 0, s.threatened ? 1 : 0,
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

/** Brass MP stamp — a third of the plate, not a delicate box. */
function drawMpStamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  mp: number,
  spent: boolean,
  attacked: boolean,
): void {
  ctx.fillStyle = spent ? '#161614' : '#3a3018';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = spent ? '#5a5648' : '#d4b05a';
  ctx.lineWidth = 6;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = spent ? '#7a7464' : '#f3ead0';
  ctx.font = font(MONO, Math.round(h * 0.46), 700);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mpLabel(mp), x + w / 2, y + h * 0.42);
  ctx.fillStyle = spent ? '#6d6858' : attacked ? '#d4b05a' : '#c9a352';
  ctx.font = font(MONO, Math.max(12, Math.round(h * 0.18)), 700);
  ctx.fillText(spent ? 'SPENT' : attacked ? 'ATK' : 'MP', x + w / 2, y + h * 0.78);
}

/** Thin gold corner ticks — contact-only. Not a ring, not a blade. */
function drawContactTicks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  ctx.strokeStyle = '#c9a352';
  ctx.lineWidth = 5;
  ctx.lineCap = 'square';
  const inset = 10;
  const arm = 16;
  const corners: Array<[number, number, number, number, number, number]> = [
    [inset, inset + arm, inset, inset, inset + arm, inset],
    [w - inset - arm, inset, w - inset, inset, w - inset, inset + arm],
    [inset, h - inset - arm, inset, h - inset, inset + arm, h - inset],
    [w - inset - arm, h - inset, w - inset, h - inset, w - inset, h - inset - arm],
  ];
  for (const [ax, ay, bx, by, cx, cy] of corners) {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.stroke();
  }
}

// Renders a unit counter to a canvas texture (320×192). Selected is the
// ground annulus; can-attack is the ground chevron; contact-only is thin
// gold ticks; threatened is a parchment edge; spent is plate dim.
export function makeCounterTexture(spec: CounterSpec): THREE.CanvasTexture {
  const w = 320;
  const h = 192;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const alpha = spec.ghost ? 0.55 : 1;
  ctx.globalAlpha = alpha;

  const bg = spec.spent ? (spec.faction === 'UA' ? '#1c2838' : '#3a201c') : FACTION_BG[spec.faction];
  // Selected lives on the ground annulus. Threatened is the only parchment
  // plate edge. Can-attack is the amber chevron. Spent is dim only.
  const edge = spec.threatened ? '#efe6d0' : FACTION_EDGE[spec.faction];
  ctx.fillStyle = bg;
  ctx.strokeStyle = edge;
  ctx.lineWidth = spec.threatened ? 12 : 5;
  ctx.beginPath();
  ctx.roundRect(5, 5, w - 10, h - 10, 12);
  ctx.fill();
  ctx.stroke();
  if (spec.spent) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.fill();
  }

  if (!spec.ghost && spec.inContact && !spec.selected && !spec.canAttack && !spec.threatened) {
    drawContactTicks(ctx, w, h);
  }

  const hasStamp = !spec.ghost && spec.movementMax != null && spec.movement != null;
  const fx = 48;
  const fy = 20;
  const fw = hasStamp ? 168 : 220;
  const fh = 88;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 5;
  ctx.strokeRect(fx, fy, fw, fh);

  if (spec.ghost && (spec.intelLevel ?? 0) < 2) {
    ctx.fillStyle = edge;
    ctx.font = font(MONO, 56);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', fx + fw / 2, fy + fh / 2 + 4);
  } else {
    drawSymbol(ctx, spec.type, fx + 22, fy + 12, fw - 44, fh - 24, spec.spent ? '#8a8474' : '#e8e2d2');
  }

  ctx.fillStyle = spec.spent ? '#8a8474' : '#e8e2d2';
  ctx.font = font(MONO, 28, 700);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(abbreviate(spec.name, spec.type), hasStamp ? 132 : w / 2, 140);

  if (!spec.ghost || (spec.intelLevel ?? 0) >= 3) {
    const bw = hasStamp ? 200 : w - 56;
    const bx = 28;
    const by = 152;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(bx, by, bw, 16);
    const t = Math.max(0, Math.min(1, spec.strength / 100));
    ctx.fillStyle = t > 0.6 ? '#8fae72' : t > 0.35 ? '#c9a352' : '#b04a3a';
    ctx.fillRect(bx, by, bw * t, 16);
    ctx.strokeStyle = 'rgba(232,226,210,0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, 16);
  }

  if (!spec.ghost) {
    ctx.fillStyle = SUPPLY_COLOR[spec.supply];
    ctx.beginPath();
    ctx.arc(28, 36, 11, 0, Math.PI * 2);
    ctx.fill();
    if (spec.entrenchment > 0) {
      ctx.strokeStyle = '#cfc9b8';
      ctx.lineWidth = 5;
      for (let i = 0; i < Math.min(spec.entrenchment, 4); i++) {
        ctx.beginPath();
        ctx.moveTo(16, 58 + i * 14);
        ctx.lineTo(40, 58 + i * 14);
        ctx.stroke();
      }
    }
    if (spec.reinforcing) {
      ctx.fillStyle = '#8fae72';
      ctx.font = font(MONO, 24, 700);
      ctx.textAlign = 'center';
      ctx.fillText('+', 28, 128);
    }
    if (spec.disorganized) {
      ctx.fillStyle = '#c9a352';
      ctx.font = font(MONO, 24, 700);
      ctx.textAlign = 'center';
      ctx.fillText('!', 28, spec.reinforcing ? 150 : 128);
    }
    if (hasStamp) {
      drawMpStamp(ctx, 220, 16, 90, 120, spec.movement!, Boolean(spec.spent), Boolean(spec.hasAttacked));
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
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
  canAttack?: boolean;
  threatened?: boolean;
}

export function standardKey(s: StandardSpec): string {
  return [
    'std', s.type, s.faction, s.name, s.tier, s.supply, s.experience, s.selected,
    s.movement ?? '', s.movementMax ?? '', s.spent ? 1 : 0, s.hasAttacked ? 1 : 0,
    s.inContact ? 1 : 0, s.canAttack ? 1 : 0, s.threatened ? 1 : 0,
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
  const edge = spec.threatened ? '#efe6d0' : FACTION_EDGE[spec.faction];
  ctx.fillStyle = bg;
  ctx.strokeStyle = edge;
  ctx.lineWidth = spec.threatened ? 8 : 3;
  ctx.beginPath();
  ctx.roundRect(3, 3, w - 6, h - 6, 10);
  ctx.fill();
  ctx.stroke();
  if (spec.spent) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.fill();
  }
  if (spec.inContact && !spec.selected && !spec.canAttack && !spec.threatened) {
    drawContactTicks(ctx, w, h);
  }

  drawSymbol(ctx, spec.type, 16, 18, 48, 40, spec.spent ? '#8a8474' : '#e8e2d2');

  ctx.fillStyle = spec.spent ? '#8a8474' : '#e2dcc8';
  ctx.font = font(MONO, 28, 700);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(abbreviate(spec.name, spec.type), 74, 32);

  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(86 + i * 22, 62, 7, 0, Math.PI * 2);
    if (i < spec.tier) {
      ctx.fillStyle = spec.tier > 2 ? '#8fae72' : spec.tier > 1 ? '#c9a352' : '#b04a3a';
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(226,220,200,0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  ctx.fillStyle = SUPPLY_COLOR[spec.supply];
  ctx.beginPath();
  ctx.arc(30, 66, 8, 0, Math.PI * 2);
  ctx.fill();

  if (spec.experience > 0) {
    ctx.strokeStyle = '#d8cf9a';
    ctx.lineWidth = 3;
    for (let i = 0; i < Math.min(3, spec.experience); i++) {
      const cx = 168;
      const cy = 14 + i * 12;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy + 5);
      ctx.lineTo(cx, cy - 3);
      ctx.lineTo(cx + 8, cy + 5);
      ctx.stroke();
    }
  }

  if (spec.movementMax != null && spec.movement != null) {
    drawMpStamp(ctx, 188, 8, 60, 68, spec.movement, Boolean(spec.spent), Boolean(spec.hasAttacked));
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
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
