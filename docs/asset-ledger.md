# Asset Ledger

Governance for procedural art (v2-vision §8): every factory is code in
`src/assets/`, reviewed on the in-app turntable (`#assets` route) before it
ships. Status: `runtime` (in the game), `review` (on the turntable, not yet
shipped), `fallback` (kept only as a lower LOD), `superseded` (replaced at
runtime, kept so the review rig can show the before/after). The §1.4 tone
table is part of the review checklist: archetypal silhouettes, no
manufacturer catalogue, no spectacle.

| Factory | File | Status | Reference | Tone check | Last review |
| --- | --- | --- | --- | --- | --- |
| `tank` (MBT, UA angular / RU low-round turret) | `src/assets/vehicles.ts` | superseded | archetypal MBT silhouettes, class-level; **no remaining references** — the review rig compares against `panzer`, so this one is a deletion candidate | ✓ no insignia, muted paint | 2026-08-07 |
| `panzer` (high-detail modern German-pattern MBT: wedge turret, sleeved smoothbore, 7 road wheels, skirts) | `src/assets/vehicles.ts` | superseded | Leopard-family *class* silhouette, no catalogued marks | ✓ no insignia, muted paint, optics matte | 2026-08-07 |
| `panzerHero` (inspector-grade panzer: ~19k tri, per-link tracks, bolted wheels, procedural weathering shader) | `src/assets/panzerHero.ts` + `heroParts.ts` | runtime | same class silhouette at showcase density; covers the Armored class for both factions (paint split). 0.2.17: dark hull / light top so boot-height reads as a machine on khaki | ✓ no insignia, weathering restrained (field dust, no wreck spectacle) | 2026-09-17 |
| `mechHero` (inspector-grade tracked IFV: front sprocket, per-link tracks, autocannon turret, rear ramp) | `src/assets/heroMech.ts` + `heroAssemblies.ts` | runtime | Marder-family *class* silhouette | ✓ no insignia, muted paint | 2026-08-07 |
| `artilleryHero` (inspector-grade towed 155: split trails, spades, elevated tube, muzzle brake, handwheels) | `src/assets/heroArtillery.ts` | runtime | FH70-family *class* silhouette, firing pose | ✓ no insignia, muted paint | 2026-08-07 |
| `reconHero` (inspector-grade 4×4 recon: tread tires, sloped bonnet, sensor mast, spare wheel) | `src/assets/heroRecon.ts` | runtime | Fennek-family *class* silhouette; its own mast replaced the `droneMast` prop | ✓ no insignia, muted paint, optics matte | 2026-08-07 |
| `heroFleet` (unit-type → hero geometry registry) | `src/assets/heroFleet.ts` | runtime | one geometry per (type, faction); the map instances it per element | n/a | 2026-08-07 |
| `terrainHero` (inspector-grade ground tiles: meadow / steppe / ploughed chernozem field / sand / marsh; blade-geometry grass, soil-strata diorama walls, baked AO, procedural detail shader, wind sway) | `src/assets/terrainHero.ts` | review | generic mid-latitude ground classes as cut-earth dioramas — no real-location depiction, no satellite likeness; `Vegetation` is its map LOD | ✓ restrained palette, vegetation abstract, no battlefield litter | 2026-08-07 |
| `Vegetation` (map ground cover: steppe tuft clumps, cropland stubble rows, wetland tufts + reeds; blade geometry from `terrainHero`) | `src/map/Vegetation.tsx` | runtime | placement driven by the geodata crop/wetland fractions; one merged static draw call, deterministic from tile hashes | ✓ muted palette on the terrain albedo, comes off the paper map with the other 3D clutter | 2026-08-07 |
| `ifv` (tracked IFV + autocannon) | `src/assets/vehicles.ts` | superseded | archetypal IFV/APC class | ✓ | 2026-08-07 |
| `lightTruck` (soft-skin, canvas bed) | `src/assets/vehicles.ts` | runtime | utility truck class; artillery limber and replacement column | ✓ | 2026-08-03 |
| `supplyTruck` (truck + fuel drums) | `src/assets/vehicles.ts` | runtime | logistics element; drums signal supply state | ✓ | 2026-08-03 |
| `towedGun` (split-trail howitzer) | `src/assets/vehicles.ts` | superseded | towed artillery class | ✓ | 2026-08-07 |
| `mrap` (v-hull patrol vehicle + mast) | `src/assets/vehicles.ts` | superseded | recon vehicle class | ✓ | 2026-08-07 |
| `figure` (dismount, abstract) | `src/assets/vehicles.ts` | runtime | silhouette-level only; no faces, no wounds | ✓ §1.4: attrition = fewer figures, never bodies | 2026-08-03 |
| `droneMast` (drone team marker) | `src/assets/vehicles.ts` | superseded | abstract ISR marker; `reconHero` carries its own mast, so **no remaining references** — deletion candidate | ✓ | 2026-08-07 |
| `smokePuffs` (post-attack residue) | `src/assets/vehicles.ts` | runtime | quiet grey wisps, no fire | ✓ no explosion-as-fireworks | 2026-08-03 |
| `makeMiniatureBuild` (composition + state mapping; splits hero vehicles from vertex-coloured props) | `src/assets/units.ts` | runtime | §6.2 state table; echelon layout sized to the base plate | ✓ | 2026-08-07 |
| `makeEarthworksGeometry` (entrenchment 0–4 + dragon's teeth) | `src/assets/units.ts` | runtime | field fortification profiles | ✓ | 2026-08-03 |
| counter plates (v1) | `src/map/textures.ts` | superseded | NATO symbology | ✓ | 2026-08-02 |
| counter plates (campaign LOD) | `src/map/textures.ts` | runtime | cardstock NATO: faction rail, ink frame, brass MP disc | ✓ no insignia, stamp hierarchy | 2026-09-17 |
| standards (miniature nameplates) | `src/map/textures.ts` | runtime | distilled counter plate | ✓ | 2026-08-03 |

## Review checklist

1. Silhouette identifiable at gameplay camera height (the squint test).
2. Class-archetypal, not catalogued: "an MBT", never a named vehicle.
3. Faction identity on the base plate only; paint stays muted.
4. No gore, no bodies, no burning-vehicle spectacle (§1.4 is normative).
5. Bounded draw cost. Props merge to one vertex-coloured geometry per
   formation; hero vehicles are one shared geometry per (type, faction),
   instanced per element. Never merge a hero model into the per-spec
   miniature cache — a tier-4 armored formation would bake ~6 MB of
   duplicated vertices into a key that is never evicted.
6. Deterministic: variation seeds from unit id / tile hash, never
   `Math.random()`.
7. The formation fits its base plate. The plate is 0.74 × 0.52 and does
   *not* turn with the vehicles, so check the worst case: full tier, both
   extremes of the per-unit facing jitter. `golden.mjs`'s
   `closeup-formation.png` is the regression guard.
