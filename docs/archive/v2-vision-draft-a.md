# THEATRE: BLACK EARTH — v2 Vision

**Status:** proposal · **Author:** design pass, August 2026 · **Target:** v0.2.0
**Predecessor:** [v1 briefing](../archive/v1-briefing.md) · [changelog](../changelog.md) · [codebase overview](../overview.md)

---

## 0. One sentence

v1 proved the *simulation*; v2 makes it **look and feel like a Paradox-tier
grand strategy title** — real Ukrainian topography under a continuous, lit,
weathered relief map, formations rendered as the machines they actually are,
and an interface built like the apparatus around a command map table.

**The simulation does not change.** Everything in `src/game/rules/` stays
byte-for-byte as it is. v2 is a rendering, content and interface release that
lands almost entirely in `src/map/`, `src/ui/` and a new build-time asset
pipeline. That separation is the reason a release of this ambition is
tractable at all — see [overview §2](../overview.md).

---

## 1. Reading the references

Three images sit in [`docs/refs/`](../refs/). Each teaches something different,
and one of them we must deliberately *not* copy.

### 1.1 Victoria 3 — what "realistic but not photoreal" actually means

The Vic3 screenshot is the closest thing to our target. What makes it work:

- **The land is continuous.** There is no visible tile grid. Provinces exist
  as data, but the eye sees hills, valleys, river meanders and coastline.
  Borders are painted *on top* of terrain, not built out of it.
- **Terrain is painted, not photographed.** Grass is a hand-tuned green with
  visible variation; forests are clustered geometry, not a texture; farmland
  reads as parcels. It is legible at a glance and would never be mistaken for
  satellite imagery.
- **Settlements are models with silhouette.** Manchester, Leeds and Sheffield
  are recognisable clusters of buildings at different densities — you can read
  the industrial geography without a single number.
- **Light does the heavy lifting.** Warm low sun, long soft shadows on the
  hills, aerial haze toward the coast, a slight bloom on water.
- **The UI is framed, layered and hierarchical.** The primary panel gets an
  ornate frame with a titled header; the journal cards on the right get a
  plainer treatment; the bottom bar is circular icon buttons. You always know
  which panel is the subject.

### 1.2 Civ 6 — readability and units-as-things

- **Units are models on the hex, not counters.** Spearmen, a catapult, a
  horseman — each identifiable in silhouette from a normal camera height.
  Critically, Civ6 shows a unit as *several figures*, which makes formation
  size and damage readable without reading a bar.
- **Hexes are visible but subordinate.** The grid is a soft edge in the
  terrain, not a tray of tokens. Borders are a thick green/white ribbon that
  reads instantly at any zoom.
- **Every terrain type has a distinct silhouette.** Forest = tree models.
  Mountain = ridge geometry. Marsh = reeds and standing water. You never need
  the terrain map mode to know what you are looking at.
- **What we must not take:** the saturation and the cheerfulness. Civ6's
  palette is a toybox. Ours is black earth, dry grass, concrete and slate.

### 1.3 Victoria 2 — the political map as a *different renderer*

The Vic2 image is not a 3D scene at all. It is a parchment map: pastel
political fills, an ocean of flat blue, country names set in wide-tracked
letterforms arched along the shape of the territory, a graticule.

This is the single best idea to steal wholesale. Our Political map mode
currently just re-tints the same hexes ([`palette.ts:65`](../../src/map/palette.ts)).
In v2 it should become **a genuinely different visual mode** — paper, ink,
flat washes, drawn borders — that the camera eases into. See §5.

### 1.4 The tonal constraint

Both Paradox and Firaxis are depicting history or fiction. We are depicting a
war that is happening. The README's editorial stance — *"intentionally serious,
restrained and non-triumphalist"* — is a design constraint that outranks the
references wherever they conflict:

| Reference does | We do instead |
| --- | --- |
| Gold filigree, heraldic ornament, victory fanfare | Machined metal, olive canvas, acetate, chinagraph — the apparatus of a command post |
| Saturated, sunny, inviting palette | Overcast Eastern European light; colour reserved for information |
| Named real hardware as a collectible roster | Archetypal silhouettes (MBT, IFV, towed gun) — recognisable class, not a manufacturer catalogue |
| Casualties as spectacle | No gore, no death animation. Attrition reads as *fewer figures and worse posture* |
| Triumphal capture effects | A quiet, definite change of control. Weight, not celebration |

**Rule:** if a visual effect would feel wrong projected in a briefing room, it
does not ship.

---

## 2. The five pillars of v2

1. **Real ground.** The map becomes actual Ukrainian topography, hydrography
   and land cover, quantised onto the existing hex grid at build time.
2. **A continuous relief surface.** Hex prisms are retired. Land is one lit,
   textured, displaced mesh; hexes become an overlay that strengthens on
   demand.
3. **Formations as machines.** Counters become models — tanks, IFVs, guns,
   dismounts — with state legible from silhouette and figure count.
4. **A framed interface.** The HUD grows material, hierarchy and an icon
   system, in the map-table idiom.
5. **Map modes as renderers.** Political mode becomes a parchment map;
   Supply becomes a network diagram; Intelligence becomes an acetate overlay.

---

## 3. Pillar 1 — Real ground (build-time geodata pipeline)

### 3.1 The idea

v1's map is two hand-authored 26×17 ASCII layers
([`blackEarth2025.ts`](../../src/game/scenarios/blackEarth2025.ts)). It is
honest and it validates, but the Dnipro is a hand-drawn ladder and the terrain
is an approximation.

v2 derives the scenario from open geospatial data — the domain
[GeoLibre](https://github.com/opengeos/GeoLibre) covers — through an **offline
Node script that emits the same scenario module shape**. Nothing about the
runtime changes: no network calls, no GIS dependency in the bundle, saves stay
deterministic.

```
  open data (COG / PMTiles / GeoParquet)
            │
            ▼
  scripts/geo/build-scenario.mjs        ← runs offline, committed output
            │  sample · classify · quantise to hex · enforce invariants
            ▼
  src/game/scenarios/blackEarth2025.ts  ← same shape as today
            │
            ▼
  build.ts  ← UNCHANGED validator, now acting as the pipeline's acceptance test
```

### 3.2 Layers and sources

| Layer | Source | Becomes |
| --- | --- | --- |
| Elevation | Copernicus GLO-30 DEM (COG) | `tile.elevation` (mean per hex) **and** a 4× supersampled heightmap PNG for the render mesh |
| Land cover | ESA WorldCover 10 m, 11 classes | `tile.terrain` by dominant class → `plains / forest / urban / marsh / water` |
| Hydrography | OSM `waterway=river` + HydroSHEDS | River **edges** — the bank-ladder generator (§3.3) |
| Roads | OSM `highway=motorway\|trunk\|primary` | `tile.road` corridors |
| Rail | OSM `railway=rail` | `tile.rail` corridors |
| Settlements | OSM `place=city\|town` + population | City list; VP scaled by population band |
| Coastline / water bodies | OSM `natural=water`, Black Sea polygon | Water tiles, shoreline mask for the water shader |

Everything above is openly licensed; the pipeline records source, licence and
retrieval date in a generated header comment so provenance ships with the data.

### 3.3 The hard part: rivers must still be ladders

This is the constraint that will bite. Real river geometry is a polyline; our
rules put rivers on **hex edges**, generated from two bank chains that must each
be a hex-adjacent "ladder" — the invariant recorded in
[overview §6.3](../overview.md) after the RU AI drove a tank division through a
vertex hole and took Dnipro on turn 1.

The generator must therefore not emit raw traced geometry. It must:

1. Rasterise the river polyline to a hex path.
2. Walk that path and split it into left-bank and right-bank chains.
3. **Repair** each chain into a strictly hex-adjacent sequence, inserting
   intermediate hexes where odd-r row-parity creates a diagonal gap.
4. Re-run `assertAdjacent` locally and fail the build with the offending pair.

`build.ts` already throws on violations, so a bad pipeline run cannot reach a
player. Treat that validator as the pipeline's test suite — it is the reason
this is safe to automate.

### 3.4 Scope and grid size

Real geography argues for a finer grid. 26×17 = 442 cells over the whole
theatre is coarse (≈50 km hexes). v2 should evaluate **48×32 (≈1,500 cells,
≈25 km hexes)**, which:

- makes the Dnipro read as a river rather than a boundary,
- gives cities room to be distinct places rather than adjacent tiles,
- keeps supply flood-fill and Dijkstra costs trivial (still microseconds),
- roughly triples unit count for a comparable frontage — a **balance change**,
  so it must be re-tuned against `BALANCE=1` AI-vs-AI runs before it ships.

Decide this early; it cascades into everything else.

---

## 4. Pillar 2 — A continuous relief surface

### 4.1 Retire the hex prisms

Today all land is one `InstancedMesh` of `CylinderGeometry(1,1,1,6)` with
per-instance vertex colour ([`Tiles.tsx:32`](../../src/map/Tiles.tsx)). Colour
is the *only* signal — no texture, no normal map, no continuity between
neighbours. That is what makes it read as a board game rather than a theatre.

**v2 renders the land as a single displaced, textured mesh**, with hexes drawn
on top as an overlay. This is what Civ6 actually does, and it is why Civ6 reads
as terrain while still being unambiguously a hex game.

```
┌─────────────────────────────────────────────────────────┐
│ TerrainMesh          subdivided plane, ~256×192 verts    │
│                      displaced by the baked heightmap    │
│                      (smoothed across hex centres so     │
│                       elevation still matches the rules) │
├─────────────────────────────────────────────────────────┤
│ Splat material       4-way blend: grass / plough /       │
│                      forest floor / mud, chosen per      │
│                      pixel from a terrain-index texture; │
│                      triplanar on slopes; normal +       │
│                      roughness maps; macro variation     │
│                      noise to kill tiling                │
├─────────────────────────────────────────────────────────┤
│ Hex overlay shader   thin darkened seam at hex edges,    │
│                      opacity driven by camera height and │
│                      interaction state (0.15 idle →      │
│                      0.6 when a unit is selected)        │
├─────────────────────────────────────────────────────────┤
│ Control wash         faction tint as a soft screen-space │
│                      wash with a hard, animated frontier │
│                      ribbon (Civ6's green/white idea in  │
│                      our palette)                        │
└─────────────────────────────────────────────────────────┘
```

The terrain-index and control textures are small (one texel per hex, nearest
sampled with a blur pass), regenerated only when control changes — the same
cadence as today's colour baking.

### 4.2 Water

The Black Sea and the Dnipro currently render as flat `#39485a`. v2 gets a
proper water material: two scrolling normal maps, screen-space reflection of
the sky colour, a shoreline foam term from a distance-to-land field, and depth
tinting. The Dnipro is the map's central strategic feature — it must look like
one.

### 4.3 Vegetation and settlement

| Feature | v1 | v2 |
| --- | --- | --- |
| Forest | 3–5 cones per tile | 2–3 instanced tree species (birch/pine/poplar), LOD to billboards past mid-zoom, density from land-cover fraction |
| Urban | 6 grey boxes | Building kit — blocks, towers, an industrial set; density and height from population band; damage state on contested tiles |
| Town | 2 boxes | Small settlement kit — houses, a church, a grain silo |
| Farmland | none | Field parcels as a texture layer with visible strip geometry — the signature look of the Ukrainian plain |
| Fortification | flat ring | Earthworks: berms, trench lines, dragon's teeth — geometry that *grows with `entrenchment` 0→4* |

Vegetation is the main new instance load. Budget in §8.

### 4.4 Light, atmosphere and post

Current lighting is one hemisphere + one directional light with `FogExp2`
([`MapScene.tsx:20`](../../src/map/MapScene.tsx)). v2 adds, via
`@react-three/postprocessing`:

- **Cascaded shadows** for long low-sun shadows across the steppe.
- **SSAO** — the cheapest, highest-impact upgrade for making relief read.
- **Colour grading per weather** via a small LUT, replacing today's raw sky and
  fog colours. Mud is a different *film stock*, not just a browner fog.
- **Bloom**, tightly restrained, on water and on fires.
- **Vignette + subtle DOF** at high zoom so the focus tile sits in a pool of
  sharpness.
- **Time-of-day drift** across the campaign: early turns in low spring light,
  later turns colder and flatter. Cosmetic, seeded from turn number, free.

---

## 5. Pillar 3 — Map modes as distinct renderers

Today a map mode is a colour multiplier. In v2, switching mode is a **staged
transition** — the camera eases toward its natural height, the terrain material
cross-fades, overlays fly in. Roughly 400 ms, interruptible.

| Mode | v2 treatment |
| --- | --- |
| **Political** | The Vic2 parchment map. Terrain material cross-fades to paper with a printed graticule; land becomes flat faction washes; borders become a drawn ink line with a slight wobble; city names set in wide-tracked caps, oblast names arched along their shape. Camera lifts and flattens toward top-down. |
| **Terrain** | Full realism, no washes, no labels except cities. Contour lines fade in at high zoom. The "what does the ground actually look like" mode. |
| **Supply** | Network diagram over darkened terrain. Supply flows as animated lines from sources along roads/rail; budget gradient as a heat wash; **cut corridors pulse red**. Makes the flood-fill in [`supply.ts`](../../src/game/rules/supply.ts) visible as the mechanism it is. |
| **Objectives** | Terrain desaturates hard; cities rise as lit markers scaled by VP; decisive objectives get a distinct crown treatment; arrows show VP swing since campaign start. |
| **Intelligence** | An acetate sheet dropped over the map. Confirmed contacts sharp; ghosts as pencil marks that literally fade with `IntelRecord.level`; observed area as a clean cut-out, unobserved as frosted overlay. |

---

## 6. Pillar 4 — Formations as machines

### 6.1 From counter to model

v1 renders each unit as a coloured box plus a billboarded canvas plate
([`Units.tsx:73`](../../src/map/Units.tsx)). v2 replaces this with **per-type,
per-faction models**, instanced by type.

| Unit type | Model | UA / RU differentiation |
| --- | --- | --- |
| `infantry` | 3–4 dismounted figures + a light truck | Kit colour, helmet silhouette, vehicle class |
| `mechanized` | IFV/APC-class hull + 2 dismounts | Hull profile, turret presence |
| `armored` | MBT, 2–4 depending on strength | Turret and hull silhouette |
| `artillery` | Towed gun or SPG + limber | Barrel length, carriage |
| `recon` | Light 4×4 / MRAP + a drone team | Vehicle profile |

**Archetypal, not catalogued.** These are class silhouettes — "an MBT", "an
IFV" — not identified hardware. That is both a tonal choice (§1.4) and a
workload choice.

### 6.2 State → silhouette

The best thing about model units is that `GameState` already carries everything
needed to make condition legible without a single number:

| State field | Visual expression |
| --- | --- |
| `strength` 0–100 | **Number of figures/vehicles shown** (4 → 3 → 2 → 1). The Civ6 trick, and the single most valuable readability win |
| `entrenchment` 0–4 | Earthworks grow around the position: scrape → berm → trench line → revetment |
| `supply` state | Supply truck present and stocked → absent → visible fuel drums empty; `isolated` adds a slow red pulse to the base ring |
| `readiness` | Figure posture: alert and dispersed → seated, weapons down |
| `disorganized` | Vehicles scattered off-formation, one canted |
| `reinforcing` | A replacement column parked behind the position |
| `experience` 0–3 | A small unit pennant, gaining bars |
| `hasAttacked` | Muzzle smoke lingering for the rest of the turn |

### 6.3 Keep the counters — as a layer

Wargamers read counters faster than models, and the NATO symbology in
[`textures.ts`](../../src/map/textures.ts) is genuinely good. Do not delete it.

- **Badge (default):** model on the ground, small NATO badge floating above it
  with designation and a strength pip — Vic3 does exactly this with its army
  markers.
- **Counter mode (toggle):** models hide, full v1 plates return. For dense
  fronts and for players who want the board game.
- Bind to a key (`Tab`), persist in settings, and make the AI-turn camera
  respect it.

### 6.4 Combat as a moment

When an attack resolves, the camera already focuses ([`store.ts:399`](../../src/game/state/store.ts)).
v2 adds ~1.2 s of restrained presentation: gun flashes, dust, a smoke column
that persists a turn on the contested tile, and the losing side's figures
falling back to the retreat hex along the same path the rules chose. Skippable,
speed-linked to the existing `aiSpeed` setting. No explosions-as-fireworks, no
screen shake.

---

## 7. Pillar 5 — The interface

### 7.1 Idiom: the map table

The HUD is the apparatus around a command map: machined aluminium frames, dark
olive panel fields, acetate overlays, chinagraph annotation, printed ledger
cards. Not gilt, not heraldry.

### 7.2 Concrete changes

- **Material and depth.** Panels get a three-layer treatment (frame → field →
  content) with real corner hardware, an inset shadow and a faint milled
  texture. This is what makes Vic3 panels feel like objects.
- **Hierarchy by frame weight.** The subject panel gets the full frame; the
  notification feed and journal-style cards get a plain treatment. Currently
  everything is weighted about equally.
- **An icon system.** ~40 line icons for resources, unit types, operations,
  weather, supply states and event categories, drawn as inline SVG so the
  no-assets property holds. The top bar currently leans on text where Vic3
  leans on glyph + number.
- **The top bar becomes a ledger.** Grouped resource cells with icon, value,
  and a delta chip (`+300`) exactly as in the Vic3 reference — the delta is the
  part players actually read.
- **A journal / situation rail.** Right-hand card stack for the campaign's live
  concerns: threatened cities, isolated formations, pending decisions, ongoing
  operations. Currently these are transient notifications that scroll away.
- **Type.** Spectral / Inter / IBM Plex Mono are already right. Tighten the
  scale, add tabular figures for all numerics, and reserve Spectral for panel
  headers only.
- **Sound.** Extend the procedural engine ([`audio.ts`](../../src/audio/audio.ts))
  with a map-table foley layer — paper, pencil, switch clicks — and per-weather
  ambience beds.

### 7.3 The readability contract

Every change in this document is subject to one hard rule:

> **The squint test.** From a normal camera height, with the image blurred,
> a player must still be able to identify (a) who controls what, (b) where the
> front line is, and (c) which formations are damaged.

If a material, a tree density or a post effect breaks that test, it loses. This
is the specific failure mode of prettifying a wargame, and it is the thing most
likely to go wrong in v2.

---

## 8. Performance budget

The simulation is not the constraint — 442 (or 1,536) tiles and ~34 units are
nothing. The budget is entirely rendering.

| Item | Budget |
| --- | --- |
| Terrain mesh | ~50k triangles, one draw call |
| Trees | ≤ 40k instances across 3 species, 2 LODs, frustum culled |
| Buildings | ≤ 8k instances from a shared kit |
| Units | ≤ 40 formations × ≤ 6 sub-models, instanced per type — ≤ 12 draw calls |
| Post chain | SSAO + bloom + grade + vignette, ≤ 4 ms at 1440p |
| Target | 60 fps at 1440p on integrated graphics; 30 fps floor on a 5-year-old laptop |
| Bundle | ≤ 8 MB gzipped total. Procedural/code-generated assets preferred over binaries throughout |
| Cold start | ≤ 3 s to interactive map |

A **quality preset** (Low / Medium / High) belongs in the settings modal,
defaulting from a startup benchmark. Low disables post, tree LOD 1 and
shadows; the game must remain completely playable there.

---

## 9. Roadmap

Six phases, each independently shippable and each ending with `npm test`,
`npx tsc --noEmit`, `node scripts/playtest.mjs` and a fresh screenshot all
green.

| Phase | Title | Contents | Done when |
| --- | --- | --- | --- |
| **A** | Ground truth | Geodata pipeline; grid-size decision; regenerated scenario; balance re-tune | Generated scenario passes `build.ts` unmodified; `BALANCE=1` runs produce sane campaigns |
| **B** | The surface | Terrain mesh + splat material + hex overlay + control wash; water shader; retire `Tiles.tsx` prisms | Squint test passes; 60 fps at target |
| **C** | Light | SSAO, cascaded shadows, per-weather LUT grading, bloom, vignette, time-of-day drift | Side-by-side with the Vic3 ref reads as the same *class* of image |
| **D** | Formations | Unit models, state→silhouette mapping, figure-count strength, badge/counter toggle, earthworks | A player can read strength and supply state with the side panel closed |
| **E** | Interface | Panel materials, icon system, ledger top bar, journal rail, type pass, foley | Vic3-grade hierarchy; no regression in tutorial completion |
| **F** | Presentation | Map modes as renderers (parchment political mode first), combat moment, cinematic AI turn | Mode switching feels like changing instrument, not changing colour |

Phases A and B are the load-bearing ones. C is the highest ratio of impact to
effort and could be pulled forward if a demo is needed early.

---

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| **Prettier but less readable** — the classic failure | The squint test (§7.3) as a gate on every phase; counter mode as a permanent escape hatch |
| **Grid resize silently rebalances the campaign** | Treat §3.4 as a *rules* change: re-tune with `BALANCE=1` before merging, and bump `SAVE_VERSION` |
| **Geodata pipeline emits invalid rivers** | `build.ts` already throws; the ladder repair step (§3.3) plus a pipeline unit test on known-hard meanders |
| **Bundle bloat from art assets** | Prefer procedural/code-generated geometry (see `img2threejs` below); hard 8 MB gate in CI |
| **Perf collapse on integrated GPUs** | Quality presets from a startup benchmark; Low must stay fully playable |
| **Scope** | Six independently shippable phases; v2 can ship after any of them |
| **Tone drift toward war-as-spectacle** | §1.4 table is normative; combat presentation reviewed against it explicitly |
| **Determinism regressions** | All new randomness (tree placement, building variation, debris) must be hashed from tile coordinates, never `Math.random()` — the rule in [overview §6.2](../overview.md) |

---

## 11. What explicitly does *not* change

- `src/game/rules/**` — every rule function, untouched.
- `GameState` shape, except a possible grid-size bump and any new *cosmetic*
  fields, which must stay JSON-serializable and trigger a `SAVE_VERSION` bump.
- The RNG-in-state determinism guarantee.
- The no-backend, no-accounts, no-runtime-network property. The geodata
  pipeline is **build time only**; generated data is committed.
- `window.__TBE_DEBUG__` as the sanctioned automation surface — extend, don't
  bypass.

---

## 12. Resources

Shared for this plan; kept here so they are not lost.

### Geospatial data and mapping

- **GeoLibre (repository)** — <https://github.com/opengeos/GeoLibre>
  MIT-licensed, cloud-native GIS platform (Tauri + React + TypeScript,
  MapLibre GL JS, DuckDB-WASM Spatial, deck.gl). Relevant to §3 as both a
  toolchain and a reference for handling COG / PMTiles / GeoParquet /
  FlatGeobuf / Zarr sources.
- **GeoLibre (app)** — <https://geolibre.app/> · web build at
  <https://web.geolibre.app>
  Useful for *interactively* prospecting the theatre — auditioning DEM, land
  cover and OSM layers over Ukraine and exporting extents before writing the
  pipeline. Supports WMS/WFS/WMTS/STAC, 3D Tiles, LiDAR, and SQL querying via
  DuckDB.

### Three.js models and procedural assets

- **img2threejs** — <https://github.com/img2threejs/img2threejs>
  Apache-2.0. Turns a single reference photograph into a **TypeScript factory
  function returning a `THREE.Group`** — procedural, code-only, with pivots and
  sockets for animation, rather than a binary mesh. Strong fit for the §6 unit
  models and the §4.3 building kit: it preserves the repo's "no asset files"
  property and keeps everything diffable in git.

### Design and agent workflows

- **MengTo/Skills** — <https://github.com/MengTo/Skills>
  A collection of ~118 agent skills for design and build work, including a
  17-skill game-development set (Three.js world architecture, enemy systems,
  playable-web-game QA) and a large web-design set covering WebGL, motion,
  layout and framed-container patterns. Directly applicable to phases D–F.
- **Vesperfall asset catalog** — <https://vesperfall.mengto.chatgpt.site/asset-catalog>
  A worked example of a runtime **asset ledger** — 180 assets tracked by
  category (gear, UI icons, characters, environment, audio, VFX, PBR
  textures), separating declared paths from what actually shipped. Worth
  copying as a practice for v2: our icon system (§7.2), building kit (§4.3)
  and unit models (§6.1) will need exactly this kind of inventory.

### Visual references

- [`docs/refs/0141680_0-763411239.jpg`](../refs/0141680_0-763411239.jpg) —
  Victoria 3: realistic terrain, framed UI hierarchy, journal rail.
- [`docs/refs/ss_f501156a69223131ee8b12452f3003698334e964.1920x1080-408268194.jpg`](../refs/ss_f501156a69223131ee8b12452f3003698334e964.1920x1080-408268194.jpg) —
  Civilization VI: hex readability, units as models, border ribbon.
- [`docs/refs/1ddmzol3miv91-3777682919.jpg`](../refs/1ddmzol3miv91-3777682919.jpg) —
  Victoria 2: the parchment political map mode (§5).
