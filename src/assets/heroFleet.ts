// The hero tier on the map. One registry so the render layer never imports
// four factories by hand, and so promoting a class from `review` to `runtime`
// is a single line here plus a ledger row.
//
// Each factory caches one merged geometry per faction, so this is eight
// geometries for the whole campaign no matter how many formations exist —
// the map draws them as instances rather than baking copies into every
// miniature (see units.ts: a baked tier-4 armored formation would be ~6 MB
// of vertex data per cache key).

import * as THREE from 'three';
import { FactionId, UnitType } from '../game/types';
import { getHeroMaterial, getStampHeroMaterial } from './heroParts';
import { makeArtilleryHero } from './heroArtillery';
import { makeMechHero } from './heroMech';
import { makeReconHero } from './heroRecon';
import { makePanzerHero } from './panzerHero';

const MAKERS = {
  armored: makePanzerHero,
  mechanized: makeMechHero,
  artillery: makeArtilleryHero,
  recon: makeReconHero,
} as const;

export type HeroUnitType = keyof typeof MAKERS;

// Infantry has no hero factory yet — it stays on the parts.ts figures, and
// composition falls back to the miniature path for that type alone.
export function hasHeroModel(type: UnitType): type is HeroUnitType {
  return type in MAKERS;
}

export function heroGeometry(type: HeroUnitType, faction: FactionId): THREE.BufferGeometry {
  return MAKERS[type](faction).geometry;
}

export function usesStampHero(type: HeroUnitType): boolean {
  return type === 'armored' || type === 'mechanized' || type === 'artillery';
}

export function heroMaterial(type: HeroUnitType): THREE.Material {
  return usesStampHero(type) ? getStampHeroMaterial() : getHeroMaterial();
}

export { getHeroMaterial, getStampHeroMaterial };
