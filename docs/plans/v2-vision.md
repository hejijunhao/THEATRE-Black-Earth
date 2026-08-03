# THEATRE: BLACK EARTH — v2 Vision: *The Living Theatre*

**Status:** proposal · August 2026 · **Target:** v0.2.0
**Predecessor:** [v1 briefing](../archive/v1-briefing.md) · [changelog](../changelog.md) · [codebase overview](../overview.md)

> Merged from two independently written drafts
> ([draft A](../archive/v2-vision-draft-a.md), [draft B](../archive/v2-vision-draft-b.md)).
> Structure follows A; B contributes the north star, the zoom metaphor, the
> signature field-patchwork look, the regional architecture kit, battle wear,
> and the asset-governance workstream. Where the drafts conflicted, the
> resolution is noted inline.

---

## 0. One sentence — and a north star

v1 proved the *simulation*; v2 makes it **look and feel like a Paradox-tier
grand strategy title** — real Ukrainian topography under a continuous, lit,
weathered relief map, formations rendered as the machines they actually are,
and an interface built like the apparatus around a command map table.

What the player should see when they open v2:

> The camera drifts in low over the Dnipro at first light. The land below is
> not a grid of plastic hexes but a continuous, gently rolling landscape:
> black chernozem fields in long strip-cultivated bands of ochre and green,
> shelter belts stitched between them, the river a broad, slow, light-catching
> ribbon. Kharkiv sprawls organically — panel-block mikrorayons, industrial
> sheds, a landmark silhouette at its heart — its name set in quiet serif
> capitals. A mechanized brigade is not a cardboard counter but a small column
> of vehicles on a faction-coloured base, a standard floating above it with
> its NATO symbol and strength. The frontline is a scarred, hatched seam
> across the land. Overcast light, long soft shadows, mist pooling at the
> map's edge where the theatre fades into the unmodeled beyond. Zoom out, and
> the world quietly becomes a staff map — flat colours, paper grain, arcing
> labels. Zoom in, and it becomes terrain again.
>
> It reads instantly as *operational command*, and it is beautiful the way a
> good relief map is beautiful — not the way a cartoon is.

**The simulation does not change.** Everything in `src/game/rules/` stays as
it is. v2 is a rendering, content and interface release that lands almost
entirely in `src/map/`, `src/ui/`, a new `src/assets/` (procedural model
factories) and a build-time data pipeline. That separation is the reason a
release of this ambition is tractable at all — see [overview §2](../overview.md).

---

## 1. Reading the references

Three images sit in [`docs/refs/`](../refs/). Each teaches something
different, and one of them we must deliberately *not* copy.

### 1.1 Victoria 3 — what "realistic but not photoreal" actually means

The Vic3 screenshot is the closest thing to our target. What makes it work:

- **The land is continuous.** There is no visible tile grid. Provinces exist
  as data, but the eye sees hills, valleys, river meanders and coastline.
  Borders are painted *on top* of terrain, not built out of it.
- **Terrain is painted, not photographed.** Grass is a hand-tuned green with
  visible variation; forests are clustered geometry, not a texture; farmland
  reads as parcels. Legible at a glance, never mistakable for satellite
  imagery.
- **Settlements are models with silhouette.** Manchester, Leeds and Sheffield
  are recognisable clusters at different densities — you can read the
  industrial geography without a single number.
- **Light does the heavy lifting.** Warm low sun, long soft shadows, aerial
  haze toward the coast, a slight bloom on water. The map reads as a physical
  model on a table, framed by haze at its edges rather than ending at a cliff.
- **The UI is framed, layered and hierarchical.** The primary panel gets an
  ornate frame with a titled header; the journal cards on the right get a
  plainer treatment. You always know which panel is the subject.

*What we leave:* the Victorian ornament. Gilded scrollwork is right for 1836
and wrong for 2025. Our register is the **operations room** — see §1.4.

### 1.2 Civilization 6 — readability engineering and units-as-things

- **Units are models on the hex, not counters.** Spearmen, a catapult, a
  horseman — each identifiable in silhouette from a normal camera height.
  Critically, Civ6 shows a unit as *several figures*, which makes formation
  size and damage readable without reading a bar.
- **Hexes are visible but subordinate.** The grid is a soft edge in the
  terrain, not a tray of tokens. Borders are a thick ribbon that reads
  instantly at any zoom.
- **Every terrain type has a distinct silhouette.** Forest = tree models,
  marsh = reeds and standing water. You never need the terrain map mode to
  know what you are looking at.

*What we leave:* the saturation and the cheerfulness. Civ6's palette is a
toybox; ours is black earth, dry grass, concrete and slate. We take its
*readability engineering*, not its tone.

### 1.3 Victoria 2 — the political map as a *different renderer*

The Vic2 image is not a 3D scene at all. It is a parchment map: pastel
political fills, an ocean of flat blue, country names set in wide-tracked
letterforms arched along the shape of the territory, a graticule.

This is the single best idea to steal wholesale. Our Political map mode
currently just re-tints the same hexes ([`palette.ts`](../../src/map/palette.ts)).
In v2 it becomes **a genuinely different visual mode** — paper, ink, flat
washes, drawn borders — that the camera eases into. See §5.

### 1.4 The tonal constraint

Paradox and Firaxis depict history or fiction. We are depicting a war that is
happening. The README's editorial stance — *"intentionally serious, restrained
and non-triumphalist"* — is a design constraint that **outranks the references
wherever they conflict**:

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

## 2. Principles and pillars

Two lists govern v2: five *principles* every decision is tested against, and
five *pillars* of work that deliver it.

### Principles

1. **Readability first, painterliness second.** This is an operational
   wargame. The hard gate is the **squint test**: from a normal camera
   height, with the image blurred, a player must still identify (a) who
   controls what, (b) where the front line is, and (c) which formations are
   damaged. If a material, tree density or post effect breaks that, it loses.
2. **Sober realism, not photorealism.** Target: a hand-built terrain model in
   a war museum, lit by a north-facing window. Never: a rendered drone
   photograph of a real battlefield.
3. **The zoom metaphor.** Close = living terrain with miniatures. Far = staff
   map with counters. The transition is continuous; camera distance *is* the
   first map-mode dial.
4. **Asset-light and deterministic, still.** v1 ships zero image/model files.
   v2 keeps that discipline: textures are generated, unit models are **code**
   (procedural `THREE.Group` factories), decoration placement derives from
   `hashSeed`. No `Math.random()` anywhere in the view. Golden screenshots
   stay byte-comparable.
5. **Restraint about the war** — §1.4 is normative, reviewed per phase.

### Pillars

1. **Real ground.** The map becomes actual Ukrainian topography, hydrography
   and land cover, quantised onto the hex grid at build time.
2. **A continuous relief surface.** Hex prisms are retired. Land is one lit,
   textured, displaced mesh; hexes become an overlay that strengthens on
   demand.
3. **Formations as machines.** Counters become models — tanks, IFVs, guns,
   dismounts — with state legible from silhouette and figure count.
4. **A framed interface.** The HUD grows material, hierarchy and an icon
   system, in the map-table idiom.
5. **Map modes as renderers.** Political becomes a parchment map; Supply a
   network diagram; Intelligence an acetate overlay.

Cutting across all five: an **asset pipeline and governance** workstream (§8)
that keeps procedural art at quality without accumulating unreviewed junk.

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
deterministic. The *terrain* becomes real; the scenario — order of battle,
control lines, events — remains **designed**, per the v1 editorial stance.

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
| Elevation | Copernicus GLO-30 DEM (COG) | `tile.elevation` (mean per hex) **and** a supersampled heightmap for the render mesh |
| Land cover | ESA WorldCover 10 m | `tile.terrain` by dominant class → `plains / forest / urban / marsh / water` |
| Hydrography | OSM `waterway=river` + HydroSHEDS | River **edges** — the bank-ladder generator (§3.3) |
| Roads | OSM `highway=motorway\|trunk\|primary` | `tile.road` corridors |
| Rail | OSM `railway=rail` | `tile.rail` corridors |
| Settlements | OSM `place=city\|town` + population | City list; VP scaled by population band |
| Coastline | OSM `natural=water`, Black Sea polygon | Water tiles, shoreline mask for the water shader |

Everything above is openly licensed; the pipeline records source, licence and
retrieval date in a generated header comment so provenance ships with the
data. [geolibre.app](https://geolibre.app/) is the interactive tool for
*prospecting* these layers over the theatre before writing the pipeline.

### 3.3 The hard part: rivers must still be ladders

Real river geometry is a polyline; our rules put rivers on **hex edges**,
generated from two bank chains that must each be a hex-adjacent "ladder" — the
invariant recorded in [overview §6.3](../overview.md) after the RU AI drove a
tank division through a vertex hole and took Dnipro on turn 1.

The generator must therefore not emit raw traced geometry. It must:

1. Rasterise the river polyline to a hex path.
2. Walk that path and split it into left-bank and right-bank chains.
3. **Repair** each chain into a strictly hex-adjacent sequence, inserting
   intermediate hexes where odd-r row-parity creates a diagonal gap.
4. Re-run `assertAdjacent` locally and fail the build with the offending pair.

`build.ts` already throws on violations, so a bad pipeline run cannot reach a
player. Treat that validator as the pipeline's test suite — it is the reason
this is safe to automate. Add a pipeline unit test on known-hard meanders.

### 3.4 Scope and grid size — decide early

Real geography argues for a finer grid. 26×17 over the whole theatre is
coarse (≈50 km hexes). v2 should evaluate **48×32 (≈1,500 cells, ≈25 km
hexes)**, which:

- makes the Dnipro read as a river rather than a boundary,
- gives cities room to be distinct places rather than adjacent tiles,
- keeps supply flood-fill and Dijkstra costs trivial (still microseconds),
- roughly triples unit count for a comparable frontage — a **balance change**,
  so it must be re-tuned against `BALANCE=1` AI-vs-AI runs and bump
  `SAVE_VERSION` before it ships.

This decision cascades into everything else; it is Phase A's first task.

---

## 4. Pillar 2 — A continuous relief surface

### 4.1 Retire the hex prisms

Today all land is one `InstancedMesh` of hex cylinders with per-instance
colour ([`Tiles.tsx`](../../src/map/Tiles.tsx)) — colour is the *only* signal.
That is what makes it read as a board game rather than a theatre.

**v2 renders the land as a single displaced, textured mesh**, with hexes drawn
on top as an overlay. This is what Civ6 actually does, and it is why Civ6
reads as terrain while still being unambiguously a hex game.

```
┌─────────────────────────────────────────────────────────┐
│ TerrainMesh          subdivided plane, ~256×192 verts    │
│                      displaced by the baked heightmap    │
│                      (smoothed across hex centres so     │
│                       elevation still matches the rules) │
├─────────────────────────────────────────────────────────┤
│ Splat material       blend: grass / plough / forest      │
│                      floor / mud / concrete, chosen per  │
│                      pixel from a terrain-index texture; │
│                      triplanar on slopes; normal +       │
│                      roughness; macro variation noise;   │
│                      strip-field patchwork on plains     │
├─────────────────────────────────────────────────────────┤
│ Hex overlay shader   thin darkened seam at hex edges,    │
│                      opacity driven by camera height and │
│                      interaction state (0.15 idle →      │
│                      0.6 when a unit is selected)        │
├─────────────────────────────────────────────────────────┤
│ Control wash         faction tint as a soft wash with a  │
│                      hard, animated frontier ribbon +    │
│                      contested hatching                  │
└─────────────────────────────────────────────────────────┘
```

The terrain-index and control textures are small (one texel per hex, blurred),
regenerated only when control changes — the same cadence as today's colour
baking. Picking moves from per-instance raycast to world-position →
tile inverse math in `hex.ts`, covered by `playtest.mjs` before the cylinder
mesh is deleted.

**The signature look** lives in the splat layer: chernozem **strip-field
patchwork** — long ochre/green/black cultivated bands, oriented per-region
from the seed, with shelter belts between them. It is the iconic texture of
the Ukrainian plain and the visual meaning of the game's title.

**The map edge** gets the Vic3 treatment: desaturation, fog banks and haze
where the theatre fades into the unmodeled beyond, replacing the abrupt
`GroundPlane` slab.

### 4.2 Water

The Black Sea and the Dnipro currently render as flat dark hexes. v2 gets a
proper water material: two scrolling normal maps, sky-colour reflection, a
shoreline foam term from a distance-to-land field, depth tinting, a sun lane
under clear weather. The Dnipro is the map's central strategic feature — it
must look like one. Bridges become small road/rail models so contested
crossings read visually.

### 4.3 Vegetation and settlement

| Feature | v1 | v2 |
| --- | --- | --- |
| Forest | 3–5 cones per tile | 2–3 instanced tree species (birch/pine/poplar), LOD to billboards past mid-zoom, density from land-cover fraction |
| Urban | 6 grey boxes | Regional building kit — Soviet panel-block mikrorayons, industrial sheds, warehouse rows; density and height from population band; damage states on contested tiles |
| Town | 2 boxes | Small settlement kit — houses, a church, a grain silo |
| Landmarks | none | One abstracted low-poly silhouette per capital/major city (Derzhprom for Kharkiv, port cranes for Mariupol, cooling towers for Enerhodar…) — recognisable in outline, restrained. Needs a cosmetic `landmark` tag on cities |
| Farmland | none | Strip-field parcels in the splat layer (§4.1) |
| Fortification | flat ring | Earthworks that **grow with `entrenchment` 0→4**: scrape → berm → trench line → revetment, plus dragon's teeth on `fortified` tiles |

### 4.4 Battle wear

Tiles that hosted combat get deterministic crater and burn decals that fade
over several turns; urban blocks in fought-over cities swap to damaged
variants; a smoke column persists for a turn on a contested tile. Sober,
unspectacular, informative: you can *see* where the front has been grinding.
Needs a small per-tile `recentCombat` decay counter — one of the two cosmetic
`GameState` additions in this plan (both bump `SAVE_VERSION`).

### 4.5 Light, atmosphere and post

Current lighting is one hemisphere + one directional light with `FogExp2`
([`MapScene.tsx`](../../src/map/MapScene.tsx)). v2 adds, via
`@react-three/postprocessing`:

- **Cascaded shadows** for long low-sun shadows across the steppe.
- **SSAO** — the cheapest, highest-impact upgrade for making relief read.
- **Colour grading per weather** via a small LUT. Mud season is a different
  *film stock* — desaturated olive-brown with wet-sheen specular on roads —
  not just browner fog; snow sits blue-grey; clear spring gets one notch of
  warmth.
- **Bloom**, tightly restrained, on water and fires only.
- **Vignette + subtle DOF** at high zoom so the focus tile sits in a pool of
  sharpness. No grain overdose, no chromatic aberration.
- **Cloud-shadow patches** drifting over the ground (a scrolling noise
  texture on the light) under overcast weather.
- **Time-of-day drift** across the campaign: early turns in low spring light,
  later turns colder and flatter. Cosmetic, seeded from turn number, free.

---

## 5. Pillar 5 — Map modes as distinct renderers

Today a map mode is a colour multiplier. In v2, switching mode is a **staged
transition** — the camera eases toward its natural height, the terrain
material cross-fades, overlays fly in. Roughly 400 ms, interruptible.

| Mode | v2 treatment |
| --- | --- |
| **Political** | The Vic2 parchment map. Terrain cross-fades to paper with a printed graticule; land becomes flat faction washes; borders become a drawn ink line with a slight wobble; hatched occupation zones; city names in wide-tracked caps, oblast names arched along their shape. Camera lifts toward top-down. |
| **Terrain** | Full realism, no washes, no labels except cities. Contour lines fade in at high zoom. The default mode. |
| **Supply** | Network diagram over darkened terrain. Supply flows as animated dashed lines from sources and hubs along roads/rail, thinning with budget; heat wash for level; **cut corridors pulse red**; isolated pockets visibly starve. Makes the flood-fill in [`supply.ts`](../../src/game/rules/supply.ts) visible as the mechanism it is. |
| **Objectives** | Terrain desaturates hard; cities rise as lit markers scaled by VP; decisive objectives get a distinct treatment; arrows show VP swing since campaign start. |
| **Intelligence** | An acetate sheet dropped over the map, cool surveillance grade. Confirmed contacts sharp; ghosts as pencil marks that literally fade with `IntelRecord.level`; observed area a clean cut-out, unobserved frosted. |

---

## 6. Pillar 3 — Formations as machines

### 6.1 From counter to model

v1 renders each unit as a coloured box plus a billboarded canvas plate
([`Units.tsx`](../../src/map/Units.tsx)). v2 replaces this with **per-type,
per-faction models**, instanced by type (the roster from `types.ts:7`):

| Unit type | Model | UA / RU differentiation |
| --- | --- | --- |
| `infantry` | 3–4 dismounted figures + a light truck | Kit colour, helmet silhouette, vehicle class |
| `mechanized` | IFV/APC-class hull + 2 dismounts | Hull profile, turret presence |
| `armored` | MBTs, 2–4 depending on strength | Turret and hull silhouette |
| `artillery` | Towed gun or SPG + limber | Barrel length, carriage |
| `recon` | Light 4×4 / MRAP + a drone team | Vehicle profile |

**Archetypal, not catalogued.** These are class silhouettes — "an MBT", "an
IFV" — not identified hardware. That is both a tonal choice (§1.4) and a
workload choice. Faction identity lives on the **base plate** — v1's coloured
block becomes a proper wargaming base (faction edge light, selection glow) —
so vehicle paint stays realistic-muted and the game stays colour-readable.
Infantry figures are deliberately abstract: silhouette-level detail only.

### 6.2 State → silhouette

The best thing about model units is that `GameState` already carries
everything needed to make condition legible without a single number:

| State field | Visual expression |
| --- | --- |
| `strength` 0–100 | **Number of figures/vehicles shown** (4 → 3 → 2 → 1). The Civ6 trick, and the single most valuable readability win |
| `entrenchment` 0–4 | Earthworks grow around the position (§4.3) |
| `supply` state | Supply truck present and stocked → absent → visible fuel drums empty; `isolated` adds a slow red pulse to the base ring |
| `readiness` | Figure posture: alert and dispersed → seated, weapons down |
| `disorganized` | Vehicles scattered off-formation, one canted |
| `reinforcing` | A replacement column parked behind the position |
| `experience` 0–3 | A small unit pennant, gaining bars |
| `hasAttacked` | Muzzle smoke lingering for the rest of the turn |

Above each model floats a compact **standard**: NATO symbol, designation,
strength pip — a distilled version of today's counter plate. Intel ghosts
become grey **silhouettes** — unlit, slightly transparent, dashed base, "?"
on the standard at low intel — decaying in presence exactly as `decayIntel()`
decays the record.

### 6.3 Keep the counters — as the far LOD *and* as a toggle

Wargamers read counters faster than models, and the NATO symbology in
[`textures.ts`](../../src/map/textures.ts) is genuinely good. Do not delete
it. The two drafts proposed different mechanisms; v2 does both:

- **Automatic (the zoom metaphor):** near camera shows miniatures + slim
  standards; past a zoom breakpoint the miniatures cross-fade down and the
  full v1-style counter plates cross-fade up. Distance picks the right
  representation without asking.
- **Manual override (`Tab`):** force counter mode at any zoom — for dense
  fronts and for players who want the board game. Persists in settings; the
  AI-turn camera respects it.

### 6.4 Combat as a moment

When an attack resolves, the camera already focuses. v2 adds ~1.2 s of
restrained presentation: gun flashes, dust, a smoke column that persists a
turn on the contested tile, and the losing side's figures falling back to the
retreat hex along the same path the rules chose. Movement orders play as the
column driving the actual path with a small dust wake. Destruction: the
standard lowers and the miniature fades under smoke. Skippable, speed-linked
to the existing `aiSpeed` setting. No explosions-as-fireworks, no screen
shake, no bodies.

---

## 7. Pillar 4 — The interface

### 7.1 Idiom: the map table

The HUD is the apparatus around a command map: machined aluminium frames,
dark olive panel fields, acetate overlays, chinagraph annotation, printed
ledger cards. Not gilt, not heraldry — Vic3's *furniture quality* in a 2025
register.

### 7.2 Concrete changes

- **Material and depth.** Panels get a three-layer treatment (frame → field →
  content) with corner hardware, an inset shadow and a faint milled texture.
  This is what makes Vic3 panels feel like objects.
- **Hierarchy by frame weight.** The subject panel gets the full frame;
  notification feed and journal cards get a plain treatment. Currently
  everything is weighted equally.
- **An icon system.** ~40 line icons for resources, unit types, operations,
  weather, supply states and event categories, drawn as inline SVG so the
  no-assets property holds.
- **The top bar becomes a ledger.** Grouped resource cells with icon, value
  and a delta chip (`+300`) exactly as in the Vic3 reference — the delta is
  the part players actually read.
- **A journal / situation rail** (Vic3's best UI idea): a right-hand card
  stack for the campaign's live concerns — decisive-city progress, threatened
  cities, isolated formations, pending decisions, ops cooldowns, war-support
  trajectory. Currently these are transient notifications that scroll away.
- **Unit panel:** the miniature rendered live in a small viewport; the honest
  `CombatFactor` breakdown — a v1 crown jewel — finally gets the typography
  it deserves.
- **Event windows** framed like briefing documents — stamped header,
  monochrome vector vignette (procedural/SVG), choices as signed orders.
- **Turn transition:** a brief letterboxed "TURN 14 · APRIL · MUD" title card
  with the weather grade shifting underneath — the Paradox month-tick feel.
- **Main menu:** the live map at dawn, slow drift, title in stencil.
- **Type.** Spectral / Inter / IBM Plex Mono are already right. Tighten the
  scale, tabular figures for all numerics, Spectral reserved for headers.
- **Sound.** Extend the procedural engine ([`audio.ts`](../../src/audio/audio.ts))
  with a map-table foley layer — paper, pencil, switch clicks — and
  per-weather ambience beds.

The squint test (§2, principle 1) gates every change here too — at three
defined zoom levels, per phase.

---

## 8. Asset pipeline and governance

How the linked resources (§13) turn into practice:

- **img2threejs is the authoring pipeline** for every miniature, building and
  landmark: reference photo → staged procedural generation (blockout →
  structure → form → material) → vision-reviewed against the reference →
  committed as a TypeScript factory in `src/assets/`. Models are code:
  diffable, tree-shakeable, LOD-friendly, zero binaries. Its quality-gate
  discipline is the answer to "procedural models usually look bad."
- **A Vesperfall-style asset ledger**: `docs/asset-ledger.md` plus a dev-only
  in-app `/assets` route rendering every factory on a turntable with status
  (`runtime` / `review` / `fallback`), reference link and QA result. No asset
  ships unreviewed; no orphan assets accumulate. The §1.4 tone table is part
  of the review checklist.
- **Repo-local skills** (MengTo/Skills model): checked-in workflows in
  `.claude/skills/` for the recurring jobs — "author a miniature", "run the
  squint test", "visual regression pass" — so any agent session regenerates
  assets the same way.
- **Golden-image visual regression**: `scripts/screenshot.mjs` grows into a
  harness — one shot per map mode × weather × zoom tier, diffed in CI. The
  deterministic RNG-in-state design makes these images perfectly
  reproducible; almost no other game gets visual regression this cheap.

---

## 9. Performance budget

The simulation is not the constraint — even 1,500 tiles and ~100 units are
nothing. The budget is entirely rendering.

| Item | Budget |
| --- | --- |
| Terrain mesh | ~50k triangles, one draw call |
| Trees | ≤ 40k instances across 3 species, 2 LODs, frustum culled |
| Buildings | ≤ 8k instances from a shared kit |
| Units | instanced per type — ≤ 12 draw calls |
| Total draw calls | ≤ ~150 |
| Post chain | SSAO + bloom + grade + vignette, ≤ 4 ms at 1440p |
| Target | 60 fps at 1440p on integrated graphics; 30 fps floor on a 5-year-old laptop |
| Bundle | ≤ 8 MB gzipped. Procedural/code-generated assets throughout; expensive textures baked to canvas at load, never shipped as PNGs |
| Cold start | ≤ 3 s to interactive map |

A **quality preset** (Low / Medium / High) in the settings modal, defaulting
from a startup benchmark. Low disables post, drops tree LOD and shadows, and
may force counter mode; the game must remain completely playable there.

---

## 10. Roadmap

Six phases, each independently shippable and each ending with `npm test`,
`npx tsc --noEmit`, `node scripts/playtest.mjs` and the golden-image harness
all green.

| Phase | Title | Contents | Done when |
| --- | --- | --- | --- |
| **A** | Ground truth | Geodata pipeline; grid-size decision; regenerated scenario; balance re-tune | Generated scenario passes `build.ts` unmodified; `BALANCE=1` runs produce sane campaigns |
| **B** | The surface | Terrain mesh + splat material (incl. strip-fields) + hex overlay + control wash; water; road/rail decals; map-edge fade; retire `Tiles.tsx` prisms; golden-image harness lands | Squint test passes; 60 fps at target |
| **C** | Light | SSAO, cascaded shadows, per-weather LUT grading, bloom, vignette, cloud shadows, time-of-day drift | Side-by-side with the Vic3 ref reads as the same *class* of image |
| **D** | Formations | Unit model factories (img2threejs loop), state→silhouette mapping, figure-count strength, standards, zoom crossfade + `Tab` toggle, earthworks, ghost silhouettes; asset ledger + `/assets` route | A player can read strength and supply state with the side panel closed |
| **E** | Interface | Panel materials, icon system, ledger top bar, journal rail, unit panel viewport, event windows, turn card, main menu, type pass, foley | Vic3-grade hierarchy; no regression in tutorial completion |
| **F** | Presentation | Map modes as renderers (parchment political first), supply flow, intel acetate, combat moment, battle wear, cinematic AI turn | Mode switching feels like changing instrument, not changing colour |

Phases A and B are load-bearing. C is the highest impact-to-effort ratio and
can be pulled forward if a demo is needed early. D is the user's headline ask.

---

## 11. What explicitly does *not* change

- `src/game/rules/**` — every rule function, untouched.
- `GameState` shape, except: a possible grid-size bump (§3.4) and exactly two
  cosmetic fields — per-tile `recentCombat` (§4.4) and city `landmark` tags
  (§4.3). All JSON-serializable; each bumps `SAVE_VERSION`.
- The RNG-in-state determinism guarantee — view-layer variation seeds from
  `hashSeed`, never `Math.random()`.
- The no-backend, no-accounts, no-runtime-network property. The geodata
  pipeline is **build time only**; generated data is committed.
- `window.__TBE_DEBUG__` as the sanctioned automation surface — extend, don't
  bypass.
- The editorial stance: no photorealism, no real satellite imagery of actual
  battlefields, no depiction of human suffering, no claim to real orders of
  battle. New mechanics (fog-honouring AI, second scenario, rail
  redeployment) remain the v3 menu — this release is presentation.

---

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| **Prettier but less readable** — the classic failure | The squint test as a gate on every phase; counter mode as a permanent escape hatch |
| **Grid resize silently rebalances the campaign** | Treat §3.4 as a *rules* change: re-tune with `BALANCE=1` before merging, bump `SAVE_VERSION` |
| **Geodata pipeline emits invalid rivers** | `build.ts` already throws; the ladder repair step (§3.3) plus a pipeline unit test on known-hard meanders |
| **Procedural models plateau at "programmer art"** | img2threejs staged QA loops with vision review; asset-ledger review gate; landmark list kept short |
| **Bundle bloat** | Code-generated assets throughout; hard 8 MB gate in CI |
| **Perf collapse on integrated GPUs** | Quality presets from a startup benchmark; Low must stay fully playable |
| **Hex-picking regression when tiles stop being meshes** | World-position → tile inverse math covered by `playtest.mjs` before the prisms are removed |
| **Tone drift toward war-as-spectacle** | §1.4 table is normative and part of asset review; combat presentation reviewed against it explicitly |
| **Scope** | Six independently shippable phases; v2 can ship after any of them |
| **Determinism regressions** | All new variation hashed from tile coordinates; golden-image diffs catch drift |

---

## 13. Resources

Shared for this plan; kept here so they are not lost.

### Geospatial data and mapping

- **GeoLibre (repository)** — <https://github.com/opengeos/GeoLibre>
  MIT-licensed, cloud-native GIS platform (Tauri + React + TypeScript,
  MapLibre GL JS, DuckDB-WASM Spatial, deck.gl). Relevant to §3 as both a
  toolchain and a reference for handling COG / PMTiles / GeoParquet sources —
  and to §5 as a library of real cartographic styling practice (hillshade
  ramps, scale-dependent symbology and labeling).
- **GeoLibre (app)** — <https://geolibre.app/> · web build at
  <https://web.geolibre.app>
  For *interactively* prospecting the theatre — auditioning DEM, land cover
  and OSM layers over Ukraine and exporting extents before writing the
  pipeline. Supports WMS/WFS/WMTS/STAC, 3D Tiles, LiDAR, SQL via DuckDB.

### Three.js models and procedural assets

- **img2threejs** — <https://github.com/img2threejs/img2threejs>
  Turns a single reference photograph into a **TypeScript factory function
  returning a `THREE.Group`** — procedural, code-only, quality-gated, with
  pivots and sockets for animation, rather than a binary mesh. The authoring
  pipeline for §6 unit models, the §4.3 building kit and landmarks; preserves
  the repo's "no asset files" property and keeps everything diffable in git.

### Design and agent workflows

- **MengTo/Skills** — <https://github.com/MengTo/Skills>
  ~118 agent skills for design and build work, including a 17-skill
  game-development set (Three.js world architecture, QA workflows) and a
  large web-design set covering WebGL, motion and framed-container patterns.
  Directly applicable to phases D–F, and the model for our repo-local skills
  (§8).
- **Vesperfall asset catalog** — <https://vesperfall.mengto.chatgpt.site/asset-catalog>
  A worked example of a runtime **asset ledger** — 180 assets tracked by
  category, separating declared paths from what actually shipped. The
  governance model for `docs/asset-ledger.md` and the `/assets` route (§8).

### Visual references

- [`docs/refs/0141680_0-763411239.jpg`](../refs/0141680_0-763411239.jpg) —
  Victoria 3: painterly terrain, framed UI hierarchy, journal rail.
- [`docs/refs/1ddmzol3miv91-3777682919.jpg`](../refs/1ddmzol3miv91-3777682919.jpg) —
  Victoria 2: the parchment political map (§5).
- [`docs/refs/ss_f501156a69223131ee8b12452f3003698334e964.1920x1080-408268194.jpg`](../refs/ss_f501156a69223131ee8b12452f3003698334e964.1920x1080-408268194.jpg) —
  Civilization VI: hex readability, units as models, border ribbon.
