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

const FACTION_EDGE: Record<'UA' | 'RU', string> = {
  UA: '#7fa8d0',
  RU: '#c08a76',
};
const FACTION_RAIL: Record<'UA' | 'RU', string> = {
  UA: '#3d5a82',
  RU: '#6e3c34',
};
const PAPER = '#35322a';
const PAPER_SPENT = '#221f1a';
const INK = '#f6eed6';
const INK_DIM = '#8e8776';

function paperGrain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const p = i / 4;
    const px = (p % w) | 0;
    const py = (p / w) | 0;
    let n = Math.imul(px * 374761393 + py * 668265263, 1274126177);
    n = ((n ^ (n >>> 13)) >>> 0) / 4294967296;
    const k = (n - 0.5) * 26;
    d[i] = Math.max(0, Math.min(255, d[i] + k));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + k * 0.92));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + k * 0.8));
  }
  ctx.putImageData(img, x, y);
}

function plateBevel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 245, 220, 0.28)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 2, y + h - 4);
  ctx.lineTo(x + 2, y + 2);
  ctx.lineTo(x + w - 4, y + 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.moveTo(x + 4, y + h - 2);
  ctx.lineTo(x + w - 2, y + h - 2);
  ctx.lineTo(x + w - 2, y + 4);
  ctx.stroke();
  ctx.restore();
}

// Draw the NATO-style symbol for a unit type inside the given frame.
function drawSymbol(ctx: CanvasRenderingContext2D, type: UnitType, x: number, y: number, w: number, h: number, color: string, stroke = 7): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = stroke;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  switch (type) {
    case 'infantry':
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
      ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
      ctx.stroke();
      break;
    case 'mechanized': {
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
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w * 0.44, h * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'artillery':
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w * 0.14, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'recon':
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

/** Small brass disc — remaining MP. Hierarchy: NATO first, stamp last. */
function drawMpStamp(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  mp: number,
  spent: boolean,
  attacked: boolean,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = spent ? '#1a1814' : '#3c3014';
  ctx.fill();
  ctx.strokeStyle = spent ? '#5a5648' : '#e0c46a';
  ctx.lineWidth = Math.max(3, r * 0.16);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - r * 0.18, cy - r * 0.22, r * 0.55, Math.PI * 1.1, Math.PI * 1.85);
  ctx.strokeStyle = spent ? 'rgba(255,245,220,0.08)' : 'rgba(255,236,180,0.45)';
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.stroke();
  ctx.fillStyle = spent ? '#7a7464' : '#f8efd4';
  ctx.font = font(MONO, Math.round(r * 1.02), 700);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mpLabel(mp), cx, cy - r * 0.06);
  ctx.fillStyle = spent ? '#6d6858' : attacked ? '#d4b05a' : '#d8b45a';
  ctx.font = font(MONO, Math.max(8, Math.round(r * 0.34)), 700);
  ctx.fillText(spent ? '—' : attacked ? 'ATK' : 'MP', cx, cy + r * 0.52);
}

/** Thin gold corner ticks — contact-only. Not a ring, not a blade. */
function drawContactTicks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  ctx.strokeStyle = '#c9a352';
  ctx.lineWidth = Math.max(4, w * 0.012);
  ctx.lineCap = 'square';
  const inset = w * 0.035;
  const arm = w * 0.055;
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

// Campaign-LOD plate. Cardstock, faction rail, NATO frame as the read,
// designation and strength below, MP as a small brass disc. Selected is
// the ground annulus; can-attack is the chevron; contact is ticks.
export function makeCounterTexture(spec: CounterSpec): THREE.CanvasTexture {
  const w = 512;
  const h = 320;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const alpha = spec.ghost ? 0.55 : 1;
  ctx.globalAlpha = alpha;

  const paper = spec.spent ? PAPER_SPENT : PAPER;
  const ink = spec.spent ? INK_DIM : INK;
  const edge = spec.threatened ? '#efe6d0' : spec.ghost ? FACTION_EDGE[spec.faction] : '#c4b89a';

  ctx.fillStyle = paper;
  ctx.strokeStyle = edge;
  ctx.lineWidth = spec.threatened ? 16 : 8;
  ctx.beginPath();
  ctx.roundRect(6, 6, w - 12, h - 12, 8);
  ctx.fill();
  ctx.stroke();
  paperGrain(ctx, 6, 6, w - 12, h - 12);
  plateBevel(ctx, 6, 6, w - 12, h - 12, 8);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  if (spec.spent) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.roundRect(6, 6, w - 12, h - 12, 8);
    ctx.fill();
  }

  // Faction identity is a rail, not a flood — thick enough to read at campaign zoom.
  ctx.fillStyle = spec.spent ? (spec.faction === 'UA' ? '#1c2838' : '#3a201c') : FACTION_RAIL[spec.faction];
  ctx.fillRect(12, 14, 42, h - 28);
  ctx.fillStyle = 'rgba(255, 236, 200, 0.16)';
  ctx.fillRect(12, 14, 6, h - 28);
  ctx.fillStyle = FACTION_EDGE[spec.faction];
  ctx.fillRect(50, 14, 5, h - 28);

  if (!spec.ghost && spec.inContact && !spec.selected && !spec.canAttack && !spec.threatened) {
    drawContactTicks(ctx, w, h);
  }

  const hasStamp = !spec.ghost && spec.movementMax != null && spec.movement != null;
  const fx = 70;
  const fy = 24;
  const fw = 288;
  const fh = 164;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.fillRect(fx + 4, fy + 4, fw, fh);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 10;
  ctx.strokeRect(fx, fy, fw, fh);
  ctx.strokeStyle = 'rgba(20, 16, 10, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(fx + 8, fy + 8, fw - 16, fh - 16);

  if (spec.ghost && (spec.intelLevel ?? 0) < 2) {
    ctx.fillStyle = ink;
    ctx.font = font(MONO, 88);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', fx + fw / 2, fy + fh / 2 + 4);
  } else {
    drawSymbol(ctx, spec.type, fx + 24, fy + 16, fw - 48, fh - 32, ink, 12);
  }

  ctx.fillStyle = ink;
  ctx.font = font(MONO, 32, 700);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(abbreviate(spec.name, spec.type), fx, 226);

  if (!spec.ghost || (spec.intelLevel ?? 0) >= 3) {
    const bw = 292;
    const bx = 68;
    const by = 252;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx, by, bw, 18);
    const t = Math.max(0, Math.min(1, spec.strength / 100));
    ctx.fillStyle = t > 0.6 ? '#8fae72' : t > 0.35 ? '#c9a352' : '#b04a3a';
    ctx.fillRect(bx, by, bw * t, 18);
    ctx.strokeStyle = 'rgba(232,226,210,0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, 18);
  }

  if (!spec.ghost) {
    ctx.fillStyle = SUPPLY_COLOR[spec.supply];
    ctx.beginPath();
    ctx.arc(23, 36, 7, 0, Math.PI * 2);
    ctx.fill();
    if (spec.entrenchment > 0) {
      ctx.strokeStyle = '#cfc9b8';
      ctx.lineWidth = 3;
      for (let i = 0; i < Math.min(spec.entrenchment, 4); i++) {
        ctx.beginPath();
        ctx.moveTo(16, 56 + i * 12);
        ctx.lineTo(30, 56 + i * 12);
        ctx.stroke();
      }
    }
    if (spec.reinforcing) {
      ctx.fillStyle = '#8fae72';
      ctx.font = font(MONO, 20, 700);
      ctx.textAlign = 'center';
      ctx.fillText('+', 23, 118);
    }
    if (spec.disorganized) {
      ctx.fillStyle = '#c9a352';
      ctx.font = font(MONO, 20, 700);
      ctx.textAlign = 'center';
      ctx.fillText('!', 23, spec.reinforcing ? 140 : 118);
    }
    if (hasStamp) {
      drawMpStamp(ctx, 450, 72, 40, spec.movement!, Boolean(spec.spent), Boolean(spec.hasAttacked));
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
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
  const w = 320;
  const h = 96;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const paper = spec.spent ? PAPER_SPENT : PAPER;
  const ink = spec.spent ? INK_DIM : INK;
  const edge = spec.threatened ? '#efe6d0' : '#c4b89a';
  ctx.fillStyle = paper;
  ctx.strokeStyle = edge;
  ctx.lineWidth = spec.threatened ? 8 : 4;
  ctx.beginPath();
  ctx.roundRect(3, 3, w - 6, h - 6, 8);
  ctx.fill();
  ctx.stroke();
  paperGrain(ctx, 3, 3, w - 6, h - 6);
  if (spec.spent) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fill();
  }
  ctx.fillStyle = spec.spent ? (spec.faction === 'UA' ? '#1c2838' : '#3a201c') : FACTION_RAIL[spec.faction];
  ctx.fillRect(6, 8, 10, h - 16);
  if (spec.inContact && !spec.selected && !spec.canAttack && !spec.threatened) {
    drawContactTicks(ctx, w, h);
  }

  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 12, 52, 40);
  drawSymbol(ctx, spec.type, 28, 16, 44, 32, ink, 4);

  ctx.fillStyle = ink;
  ctx.font = font(MONO, 26, 700);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(abbreviate(spec.name, spec.type), 86, 32);

  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(96 + i * 20, 68, 6, 0, Math.PI * 2);
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
  ctx.arc(11, 18, 5, 0, Math.PI * 2);
  ctx.fill();

  if (spec.experience > 0) {
    ctx.strokeStyle = '#d8cf9a';
    ctx.lineWidth = 2;
    for (let i = 0; i < Math.min(3, spec.experience); i++) {
      const cx = 196;
      const cy = 16 + i * 10;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + 4);
      ctx.lineTo(cx, cy - 3);
      ctx.lineTo(cx + 6, cy + 4);
      ctx.stroke();
    }
  }

  if (spec.movementMax != null && spec.movement != null) {
    drawMpStamp(ctx, 286, 36, 22, spec.movement, Boolean(spec.spent), Boolean(spec.hasAttacked));
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
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
  ctx0.font = font('Spectral, Georgia, serif', px, weight);
  const textW = ctx0.measureText(name).width;
  canvas.width = Math.ceil(textW + 40);
  canvas.height = px + 26;
  const ctx = canvas.getContext('2d')!;

  ctx.font = font('Spectral, Georgia, serif', px, weight);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  // Soft halo for readability against terrain
  ctx.shadowColor = 'rgba(20,20,16,0.9)';
  ctx.shadowBlur = 3;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(20,20,16,0.75)';
  ctx.strokeText(name, cx, cy);
  ctx.fillStyle = size === 'town' ? '#d8d2c0' : '#efe9d8';
  ctx.fillText(name, cx, cy);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: canvas.width / canvas.height };
}
