# Asset Ledger

Governance for procedural art (v2-vision §8): every factory is code in
`src/assets/`, reviewed on the in-app turntable (`#assets` route) before it
ships. Status: `runtime` (in the game), `review` (on the turntable, not yet
shipped), `fallback` (kept only as a lower LOD). The §1.4 tone table is part
of the review checklist: archetypal silhouettes, no manufacturer catalogue,
no spectacle.

| Factory | File | Status | Reference | Tone check | Last review |
| --- | --- | --- | --- | --- | --- |
| `tank` (MBT, UA angular / RU low-round turret) | `src/assets/vehicles.ts` | runtime | archetypal MBT silhouettes, class-level | ✓ no insignia, muted paint | 2026-08-03 |
| `ifv` (tracked IFV + autocannon) | `src/assets/vehicles.ts` | runtime | archetypal IFV/APC class | ✓ | 2026-08-03 |
| `lightTruck` (soft-skin, canvas bed) | `src/assets/vehicles.ts` | runtime | utility truck class | ✓ | 2026-08-03 |
| `supplyTruck` (truck + fuel drums) | `src/assets/vehicles.ts` | runtime | logistics element; drums signal supply state | ✓ | 2026-08-03 |
| `towedGun` (split-trail howitzer) | `src/assets/vehicles.ts` | runtime | towed artillery class | ✓ | 2026-08-03 |
| `mrap` (v-hull patrol vehicle + mast) | `src/assets/vehicles.ts` | runtime | recon vehicle class | ✓ | 2026-08-03 |
| `figure` (dismount, abstract) | `src/assets/vehicles.ts` | runtime | silhouette-level only; no faces, no wounds | ✓ §1.4: attrition = fewer figures, never bodies | 2026-08-03 |
| `droneMast` (drone team marker) | `src/assets/vehicles.ts` | runtime | abstract ISR marker | ✓ | 2026-08-03 |
| `smokePuffs` (post-attack residue) | `src/assets/vehicles.ts` | runtime | quiet grey wisps, no fire | ✓ no explosion-as-fireworks | 2026-08-03 |
| `makeMiniatureGeometry` (composition + state mapping) | `src/assets/units.ts` | runtime | §6.2 state table | ✓ | 2026-08-03 |
| `makeEarthworksGeometry` (entrenchment 0–4 + dragon's teeth) | `src/assets/units.ts` | runtime | field fortification profiles | ✓ | 2026-08-03 |
| counter plates (v1) | `src/map/textures.ts` | fallback | NATO symbology | ✓ | 2026-08-02 |
| standards (miniature nameplates) | `src/map/textures.ts` | runtime | distilled counter plate | ✓ | 2026-08-03 |

## Review checklist

1. Silhouette identifiable at gameplay camera height (the squint test).
2. Class-archetypal, not catalogued: "an MBT", never a named vehicle.
3. Faction identity on the base plate only; paint stays muted.
4. No gore, no bodies, no burning-vehicle spectacle (§1.4 is normative).
5. Merged geometry: one draw call per miniature; vertex colours only.
6. Deterministic: variation seeds from unit id / tile hash, never
   `Math.random()`.
