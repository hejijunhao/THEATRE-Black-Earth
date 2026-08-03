// Order-of-battle placement: snap designed anchors to owned land hexes,
// resolve collisions by spiral search, support `adjacentTo` for the
// test-coupled u3/r1 pair.

import { GRID_W } from './config.mjs';
import { hexFromLonLat, neighborCoords, inGrid, hexDistance } from './hexlib.mjs';
import { OOB } from './design.mjs';

export function placeUnits(cells) {
  const occupied = new Set();
  const placed = [];
  const byId = new Map();

  const usable = (h, faction) => {
    if (!inGrid(h.x, h.y)) return false;
    const cell = cells[h.y * GRID_W + h.x];
    if (cell.terrain === null || cell.terrain === 'w') return false;
    if (cell.controller !== (faction === 'UA' ? 'u' : 'r')) return false;
    return !occupied.has(`${h.x},${h.y}`);
  };

  const spiral = (start, faction, maxR = 4) => {
    if (usable(start, faction)) return start;
    let frontier = [start];
    const seen = new Set([`${start.x},${start.y}`]);
    for (let d = 0; d < maxR; d++) {
      const next = [];
      for (const cur of frontier) {
        for (const nb of neighborCoords(cur.x, cur.y)) {
          const key = `${nb.x},${nb.y}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (usable(nb, faction)) return nb;
          next.push(nb);
        }
      }
      frontier = next;
    }
    return null;
  };

  for (const spec of OOB) {
    let anchor;
    if (spec.adjacentTo) {
      const ref = byId.get(spec.adjacentTo);
      if (!ref) throw new Error(`unit ${spec.id}: adjacentTo ${spec.adjacentTo} not yet placed`);
      // Prefer a directly adjacent friendly hex; widen if needed.
      const adj = neighborCoords(ref.x, ref.y).find((nb) => usable(nb, spec.faction));
      anchor = adj ?? spiral({ x: ref.x, y: ref.y }, spec.faction);
      if (!anchor) throw new Error(`unit ${spec.id}: no free friendly hex near ${spec.adjacentTo}`);
      if (adj === undefined) {
        console.warn(`unit ${spec.id}: not directly adjacent to ${spec.adjacentTo} (fallback)`);
      }
    } else {
      const start = hexFromLonLat(spec.lon, spec.lat);
      anchor = spiral(start, spec.faction);
      if (!anchor) throw new Error(`unit ${spec.id} (${spec.name}): no usable hex near anchor`);
      if (hexDistance(start, anchor) > 2) {
        console.warn(`unit ${spec.id}: drifted ${hexDistance(start, anchor)} hexes from anchor`);
      }
    }
    occupied.add(`${anchor.x},${anchor.y}`);
    const unit = {
      id: spec.id,
      faction: spec.faction,
      type: spec.type,
      name: spec.name,
      x: anchor.x,
      y: anchor.y,
    };
    if (spec.strength !== undefined) unit.strength = spec.strength;
    if (spec.entrenchment !== undefined) unit.entrenchment = spec.entrenchment;
    byId.set(spec.id, unit);
    placed.push(unit);
  }

  // Test contract: u3 must be adjacent to r1 (combat tests attack u3 -> r1).
  const u3 = byId.get('u3');
  const r1 = byId.get('r1');
  if (u3 && r1 && hexDistance(u3, r1) !== 1) {
    throw new Error(`OOB contract broken: u3 (${u3.x},${u3.y}) not adjacent to r1 (${r1.x},${r1.y})`);
  }
  return placed;
}
