# Changelog

All notable changes to THEATRE: BLACK EARTH are documented here.

## Index

Newest entries first. Add new releases directly below this index and
add a row for them here.

| Version | Date | Scope | Keywords |
| --- | --- | --- | --- |
| [0.2.0-F](#020-f--2026-08-03--v2-phase-f-presentation) | 2026-08-03 | v2 Phase F — Presentation | map modes as renderers, parchment political, supply flow, battle wear, combat moment, landmarks, SAVE_VERSION 3, colour-space fix |
| [0.2.0-E](#020-e--2026-08-03--v2-phase-e-the-interface) | 2026-08-03 | v2 Phase E — The interface | panel frames, icon system, ledger top bar, delta chips, journal rail, unit viewport, briefing events, turn card, live-map menu, foley, ambience |
| [0.2.0-D](#020-d--2026-08-03--v2-phase-d-formations-as-machines) | 2026-08-03 | v2 Phase D — Formations as machines | procedural miniatures, state→silhouette, strength=element count, standards, earthworks, counter LOD, Tab toggle, asset ledger, #assets route |
| [0.2.0-C](#020-c--2026-08-03--v2-phase-c-light) | 2026-08-03 | v2 Phase C — Light | SSAO, per-weather grade, bloom, vignette, cloud shadows, time-of-day sun, quality setting |
| [0.2.0-B](#020-b--2026-08-03--v2-phase-b-the-surface) | 2026-08-03 | v2 Phase B — The surface | continuous terrain mesh, strip-field albedo, tint washes, hex seam, sea shader, river ribbons, road decals, picking, golden-image harness |
| [0.2.0-A](#020-a--2026-08-03--v2-phase-a-ground-truth) | 2026-08-03 | v2 Phase A — Ground truth | geodata pipeline, 48×36 grid, DEM/WorldCover/Natural Earth, river ladders, bridges, balance re-tune, SAVE_VERSION 2 |
| [0.1.0](#010--2026-08-02) | 2026-08-02 | Initial vertical slice | simulation core, hex grid, combat, supply, fog, AI, saves, HUD, audio, tests |

## [0.2.0-F] — 2026-08-03 · v2 Phase F: Presentation

Map modes become distinct renderers (v2-vision §5); combat and attrition
become visible on the ground.

- **Parchment political map** (the Vic2 steal): the terrain material
  cross-fades (~400 ms) to warm paper with grain and a printed 1° graticule;
  control washes become strong flat fills that keep their hue (fog-of-war
  dimming is skipped — a printed map shows control, not observation); the
  hex seam and cloud shadows fade off; 3D clutter (trees, buildings,
  battle wear) comes off the map; the sea flattens to ink-wash; the weather
  film stock is bypassed for a neutral print grade. The frontline ribbon
  reads as the drawn border; counters read as staff-map tokens.
- **Supply flow**: the flood fill made visible — animated dashes crawling
  along road/rail through friendly territory (colour by remaining budget,
  oriented high→low), with red pulsing rings where an owned corridor tile
  has been cut off next to a live network.
- **Battle wear** (`tile.recentCombat`, sanctioned cosmetic field, decays
  3→0 per turn): deterministic scorch decals that fade over turns, plus a
  smoke column on freshly contested tiles. Written in `resolveCombat`,
  decayed in `resolveGlobalTurn`; balance seed 42 reproduces its exact
  pre-change result — provably simulation-neutral. `SAVE_VERSION` → 3.
- **Combat moment** (§6.4): ~1.2 s of restrained presentation on every
  resolution (player and AI) — two quick muzzle flashes via a point light
  and expanding dust, no screen shake, no fireworks.
- **Landmarks** (`city.landmark`, the second sanctioned field): abstracted
  silhouettes — Derzhprom slabs for Kharkiv, port cranes for Mariupol and
  Odesa, the dam wall for Zaporizhzhia, a memorial spire for Kyiv.
- **Colour-space fix**: the tint texture was writing linear floats into an
  sRGB-tagged texture — every wash double-darkened. All five modes gained
  correct colour from the fix.
- Deviations from the plan text, deliberate: no camera auto-lift on mode
  switch (the transition is already interruptible by design), oblast-arched
  labels and the full intel acetate sheet deferred (ghost decay + frost
  tint carry the intent), Objectives mode keeps its v1 markers.

## [0.2.0-E] — 2026-08-03 · v2 Phase E: The interface

The map-table idiom (v2-vision §7): hierarchy by frame weight, an icon
system, the ledger, the journal, briefing documents.

- **Panel material**: three-layer treatment — `.panel-framed` adds the full
  frame (bevel, inner field line, corner ticks) and marks the SUBJECT panel;
  notifications and journal cards stay deliberately plain.
- **Icon system**: ~30 inline-SVG line icons (`src/ui/icons.tsx`) —
  resources, weather, unit types, operations, journal categories. Stroke =
  currentColor; the no-assets property holds.
- **Ledger top bar**: icon + value + per-turn **delta chip** on every
  resource cell; VP shows change since campaign start.
- **Journal / situation rail** (`Journal.tsx`): live card stack — decisive
  objectives (both sides' progress), threatened cities, cut-off formations,
  pending decisions, operation cooldowns, war-support state. Derived from
  GameState every render; nothing scrolls away.
- **Unit panel viewport** (`MiniViewport.tsx`): the selected formation's
  actual miniature turning slowly — same factory, same state mapping as the
  map.
- **Event windows as briefing documents**: stamped DECISION corner, routing
  header, serif body, orders as options, sign-off line.
- **Turn title card**: letterboxed "TURN 14 · APRIL · MUD" on each new turn.
- **Main menu over the live theatre**: a throwaway backdrop campaign renders
  behind a translucent left plate; the camera drifts slowly along the
  Dnipro. No autosave is touched.
- **Settings**: graphics quality (High / Low) and the miniatures/counters
  toggle join the modal.
- **Audio**: per-weather ambience beds (wind level/pitch, rain patter) and
  map-table foley (paper swish on briefings, switch tick on mode changes).
- Type pass: tabular figures on all numerics.

## [0.2.0-D] — 2026-08-03 · v2 Phase D: Formations as machines

Counters become miniatures (v2-vision §6). Everything is procedural
TypeScript factories — models are code, zero binaries.

### Asset system (`src/assets/`)

- `vehicles.ts`: archetypal class silhouettes — MBT (UA angular turret / RU
  low round), tracked IFV, towed split-trail gun, MRAP with sensor mast,
  soft-skin trucks, abstract dismount figures, drone-team mast, supply truck
  with fuel drums. Faction identity stays on the base plate; paint is muted
  (§1.4 is normative).
- `units.ts`: miniature composition with the §6.2 state table —
  **strength → element count** (tier 1–4), supply → truck present/absent,
  disorganized → fixed off-formation scatter, reinforcing → replacement
  column at the rear, `hasAttacked` → lingering smoke; plus
  `makeEarthworksGeometry` (entrenchment 0–4 berm arcs biased toward the
  front, dragon's teeth when fortified). Every miniature merges to ONE
  vertex-coloured geometry (one draw call each).
- Asset governance: `docs/asset-ledger.md` + dev-only `#assets` turntable
  route with faction/tier/extras toggles.

### Rendering (`src/map/Units.tsx` rewrite)

- Miniatures on faction base plates + compact **standards** overhead
  (NATO symbol, abbreviated designation, strength pips, supply dot,
  experience chevrons — a distilled counter plate).
- Isolated formations pulse a slow red base ring.
- **Zoom crossfade**: miniatures + standards near, v1 counter plates past
  the zoom breakpoint — distance picks the representation. **Tab** forces
  counter mode at any zoom (persisted).
- Ghost markers keep the plate treatment but now decay opacity with intel
  age. (Full silhouette-ghosts deferred to Phase F's intel acetate.)
- Camera dev hook `__TBE_CAMERA__.set(...)` for deterministic close-ups.
- Bloom re-thresholded after the overlay discs started blooming.

## [0.2.0-C] — 2026-08-03 · v2 Phase C: Light

The post chain and the lighting model (v2-vision §4.5), via
`@react-three/postprocessing` v2 + `n8ao`.

- **SSAO** (N8AO, half-res, warm-dark occlusion colour) — relief reads.
- **Per-weather colour grade** as a custom procedural Effect (no LUT
  assets): temperature / green-magenta tint / saturation / contrast /
  lifted blacks per weather, lerped smoothly. Mud season is olive-brown
  film stock; snow sits blue-grey; clear spring gets one notch of warmth.
- **Bloom** tightly thresholded (water sun-lane and future fires only) and
  a soft **vignette**.
- **Cloud shadows**: drifting 2-octave noise darkening in the terrain
  shader under overcast/rain (units keep full readability).
- **Time-of-day drift**: sun azimuth/elevation/temperature derived from the
  turn number — low warm spring light early, colder and flatter late.
- Shadow map 4096² over the whole theatre. Deviations from the plan text:
  a single well-fitted map instead of true CSM (equivalent at our camera
  ranges), and DOF was dropped — it hazed the whole frame through the
  effect-API version gap and the plan treats it as garnish.
- `quality` setting ('high' | 'low') in the store, persisted; 'low'
  disables the whole post chain (UI toggle lands with Phase E's settings).

## [0.2.0-B] — 2026-08-03 · v2 Phase B: The surface

The hex prisms are retired. The land is one continuous, displaced, lit mesh
(v2-vision §4) built from the Phase A heightfield.

### Terrain (`src/map/terrain/`)

- `TerrainMesh.tsx`: single displaced plane (~110k tris, one draw call),
  `MeshStandardMaterial` with injected shader chunks — painted albedo,
  per-hex dynamic tint, GLSL hex-edge seam whose opacity follows selection
  state and camera height (the zoom metaphor's first dial), light-haze
  map-edge fade.
- `albedo.ts`: the painted ground, generated at load — chernozem
  **strip-field patchwork** with regional orientations and parcel breakup,
  soft land-cover fields from the geodata fractions, urban concrete, marsh,
  valley moisture, road/rail decals along the real corridor centrelines.
  Field palette luminance kept tight (variance reads as banding from
  altitude).
- `tint.ts`: per-hex RGBA wash texture (control, fog dimming, map modes,
  off-map fade) updated at the same cadence v1 baked instance colours.
- `heightfield.ts`: bilinear DEM sampling; every layer that sits on terrain
  (units, overlays, decorations, frontline, labels) grounds through it.
- `Water.tsx`: sea shader (scrolling normal noise, shore-distance depth tint
  and foam, restrained sun lane, weather-following fog) + rivers as ribbons
  along their REAL Natural-Earth courses (the rules keep the hex-edge set);
  bridge decks stay at the rules' crossing edges.
- Picking is world-position → hex inverse math on an invisible plane —
  covered by a new `playtest.mjs` click assertion, per the §12 mitigation.
- Sun now targets the map centre with a theatre-wide shadow frustum (the v1
  ±30-unit frustum smeared edge-clamp darkness across the larger map).

### Golden-image harness (`scripts/golden.mjs`)

- Fixed-seed campaign via `__TBE_DEBUG__.newGame(faction, seed)`; one shot
  per map mode + a front close-up; mean-channel diff against a blessed
  baseline (`--update`). Byte-stable across runs (0.00% drift) thanks to
  RNG-in-state determinism.

### Removed

- `Tiles.tsx` (prisms), `Roads.tsx` (line segments — roads are decals now),
  `Rivers.tsx` (edge boxes — courses are ribbons now; `mergeGeometries`
  moved to `geomUtils.ts`).

## [0.2.0-A] — 2026-08-03 · v2 Phase A: Ground truth

First phase of the [v2 vision](plans/v2-vision.md): the map becomes real
Ukrainian topography, hydrography and land cover, quantised onto the hex grid
by a build-time geodata pipeline. The front line, order of battle and all
balance numbers remain designed.

### Geodata pipeline (`scripts/geo/`)

- `node scripts/geo/build-scenario.mjs` regenerates
  `src/game/scenarios/blackEarth2025.ts` (same module shape as v1) and
  `src/map/data/terrainData.ts` (supersampled heightfield + per-hex land-cover
  fractions for Phase B). Raw data cached under `scripts/geo/cache/`
  (gitignored); output committed with provenance headers.
- Sources: Copernicus/SRTM-composite DEM (AWS Terrain Tiles, z7 terrarium),
  ESA WorldCover 10 m 2021 v200 (COG overview reads via `geotiff`),
  Natural Earth 10m rivers/roads/railroads/populated-places/admin-0.
- Rivers are traced as walks along hex-lattice **vertices**, so bank chains
  are hex-adjacent "ladders" *by construction* (the invariant from
  overview §6.3); the builder still re-validates every step. Bridges derive
  from corridor steps that cross river edges.
- Crimea handling: Natural Earth draws de-facto borders, so the theatre mask
  is Ukraine ∪ (Russia ∩ Crimea clip). Perekop/Chonhar land corridors are
  forced-marsh overrides so they survive 26 km quantisation.
- `scripts/geo/preview.mjs` prints ASCII terrain/control maps for design
  review.

### Grid decision (v2-vision §3.4)

- **48×36** (~26 km hexes; 1,728 cells, ~890 land) — the plan's 48×32
  baseline could not cover Chernihiv→Sevastopol; 36 rows keep the whole v1
  theatre at half the v1 hex size. `build.ts` now reads MAP_W/MAP_H, an
  explicit `u` (urban) terrain char and the new data-driven `ELEVATION_ROWS`
  (its validation asserts are unchanged). `SAVE_VERSION` bumped to 2.

### Scenario & balance re-tune

- 52 cities (population-banded VP + designed overrides), 34 UA / 34 RU
  formations, 25 derived bridges, 5 rivers (Dnipro, Donets, Southern Bug,
  Desna, Seym).
- War-support event costs re-tuned for the doubled formation count and
  city roster (capture swing vp/4 clamped 1–6, was vp/3 clamped 2–8; unit
  destruction −2, was −4) — sanctioned by v2-vision §12 ("treat grid resize
  as a rules change").
- Balance finding: RU supply sources were open to a single breakthrough
  (AI-vs-AI runs saw Luhansk + Rostov Axis fall by t12 → army-wide starvation
  rout). Fixed with designed rear-area security formations (r32–r34).
- AI-vs-AI reference across four seeds: UA operational victory (t36),
  RU decisive (t22), UA war-support collapse win (t34), UA territorial
  decisive (t31). Swingy but plausible, both sides able to win.
- `balance.test.ts` accepts `SEEDS=a,b` and `VERBOSE=1` for tuning runs.

## [0.1.0] — 2026-08-02

Initial vertical slice: a complete, playable single-player campaign built to
[`v1-briefing.md`](v1-briefing.md). Everything below was implemented from an
empty repository.

### Project & tooling

- Vite + React 18 + TypeScript project scaffold with strict type-checking
  (`npm run dev` / `build` / `test`).
- Dependencies: React Three Fiber + drei (three 0.170) for the map, Zustand +
  immer for state, vitest for tests, @fontsource packages (Spectral, Inter,
  IBM Plex Mono) so no fonts or assets load from the network.
- Headless verification tooling using puppeteer-core against system Chrome:
  `scripts/screenshot.mjs` (visual smoke test) and `scripts/playtest.mjs`
  (drives a full turn in a real browser via a `window.__TBE_DEBUG__` hook).

### Simulation core (`src/game`)

- Serializable `GameState` with every rule implemented as a pure function;
  seeded RNG (mulberry32) stored inside the state for reproducible saves,
  replays and combat.
- Hex grid math for odd-r offset, pointy-top layout: adjacency, distance,
  ranges, world-space layout and shared-edge geometry.
- **Scenario "Black Earth, Spring 2025"**: a hand-authored 26×17 map
  (~380 playable hexes) defined as two ASCII layers (terrain + starting
  control) plus feature lists — 33 cities/towns with VP values, supply hubs
  and sources, road/rail corridors, edge-based Dnipro and Siverskyi Donets
  rivers with 8 bridges, and 18 Ukrainian / 16 Russian starting formations
  along a 2025-style static frontline. A validating builder fails loudly on
  any authoring error (adjacency, placement, control).
- **Movement**: movement points, terrain/road/weather costs, extra cost +
  forced stop when entering enemy zones of control, river-crossing penalties
  (reduced at bridges), territory capture along movement paths.
- **Combat**: shared power model for preview and resolution
  (base × strength × readiness × morale × supply × terrain, entrenchment vs
  breakthrough, artillery support from adjacent hexes, concentric pressure,
  river assault, close support, veterancy, disorganisation) with a ±10%
  seeded swing; outcomes favour degradation and retreat over annihilation;
  retreat priority rules; destruction of cornered formations (encirclement
  works); attacker advance into vacated ground; artillery bombardment as a
  non-capturing fires action.
- **Supply**: Dijkstra budget flood from national supply sources through
  friendly territory, extended by roads/rail and partially recharged by hubs;
  five unit supply states scaling attack, movement and recovery; progressive
  isolation attrition.
- **Entrenchment**: passive growth for stationary units up to terrain caps,
  lost on movement, stripped by artillery preparation and assaults;
  fortified-tile state with defensive bonus.
- **Economy**: manpower, equipment, command points and war support per
  faction; turn income; reinforcement orders consuming resources over time
  (slower at the front and under bad supply); reserve formations deployable
  at supplied hub cities.
- **Strategic operations** (six, with per-faction costs and cooldowns):
  Reconnaissance Sweep, Artillery Preparation, Close Support, Emergency
  Resupply, Rapid Reinforcement, Fortify Position.
- **Fog of war**: terrain, cities and control always visible; enemy
  formations only inside observation range; last-known intel records that
  decay through ghost markers (full → estimated → type → contact → gone).
- **Events**: ten restrained decision events (aid packages, mobilisation,
  ammunition shortfalls, sanctions, drone programmes, winter preparations…)
  with weighted, seeded selection and clear mechanical tradeoffs.
- **Weather**: seeded monthly calendar (clear, overcast, rain, mud, snow)
  affecting movement, attack, reconnaissance, recovery and air support.
- **Victory**: per-turn campaign score from territorial change relative to
  the start; early decisive endings (decisive objectives — UA: Melitopol +
  Mariupol, RU: Kharkiv + Zaporizhzhia — war-support collapse, army
  destruction); operational victory / stalemate / defeat adjudication at the
  36-turn limit.
- **Turn structure**: player phase → stepwise AI phase → global resolution
  (supply, attrition, reinforcement, recovery, entrenchment, score, weather,
  upkeep, fog, events, victory check).
- **AI opponent**: transparent heuristic playing the same rules — protects
  threatened cities, retreats and reconstitutes damaged formations, evaluates
  attacks with the real combat preview, advances on weighted objectives, uses
  artillery preparation and emergency resupply, deploys reserves when the
  front demands it. Executes one visible action per tick so its turn can be
  presented.
- **Persistence**: versioned save format in localStorage — autosave every
  turn, three manual slots, continue-campaign and overwrite confirmation.

### Map presentation (`src/map`)

- Single-InstancedMesh hex terrain with per-tile colour baking (terrain,
  restrained faction tint, map mode, fog dimming, snow, per-tile jitter),
  subtle elevation (Carpathian and Crimean rises) and raycast picking.
- Edge-ribbon rivers with bridge decks; road and rail line networks; a raised
  dark frontline ribbon rebuilt whenever control changes.
- Deterministic terrain decorations: forest cone clusters, urban block
  clusters, town markers, fortification rings, city label sprites.
- Unit counters: faction-coloured base + billboarded canvas-texture plate
  with NATO-style symbol, designation, strength bar and status pips; smooth
  movement animation; faded ghost markers for stale enemy intel.
- Interactive overlays: movement range (with ZOC and enemy-ground tinting),
  attack-target rings, operation/deploy targeting, selection and hover rings,
  objective markers in the Objectives mode.
- Five map modes: Political, Supply (network gradient), Terrain, Objectives,
  Intelligence.
- Tilted strategic camera (MapControls) with clamped tilt/rotation/zoom and
  smooth focus animation toward AI actions and alerts.
- Weather atmosphere: per-weather sky, exponential fog, sun/ambient levels
  and a rain/snow particle field; soft directional shadows.

### Interface (`src/ui`)

- Custom CSS design system per the art direction: dark translucent panels,
  fine borders, Spectral display type, Inter UI text, IBM Plex Mono data.
- Top bar (turn/date, weather, faction, manpower, equipment, command, war
  support vs enemy, score, VP) — every cell tooltipped.
- Context side panel: formation details (condition bars, stats, status tags),
  sector/city details, and the attack preview with verdict category, both
  power totals, uncertainty note when unobserved, and the full factor list
  with confirm/cancel.
- Bottom command bar: Reinforce, Entrench, Operations popover, Reserves
  popover, End Turn (with idle-formation / unresolved-decision warnings).
- Engagement result panel, event decision modal, settings modal (master /
  ambience / effects volume, mute, enemy-turn speed, save/load slots),
  notification feed, enemy-turn banner with live action text and skip,
  campaign-end screen with outcome and scores.
- Main menu: faction selection with gameplay-flavour descriptions, new
  campaign (with overwrite confirmation), continue, load slots, tutorial
  toggle, and the scenario disclaimer.
- Eight-step contextual first-turn tutorial that advances by observing the
  player actually perform each taught action; skippable at any point.
- Keyboard: `Esc` cancels/deselects, `Shift+Enter` ends the turn.

### Audio (`src/audio`)

- Fully procedural WebAudio engine (no asset files): wind ambience, low
  drone bed, UI clicks, selection/move cues, combat and bombardment impacts,
  capture and turn-end signatures; master/music/sfx buses with persisted
  volume settings and mute; starts on first user gesture.

### Testing & balance

- 16-test vitest suite: hex adjacency symmetry, scenario integrity (size,
  control, stacking, supply, rivers), movement/ZOC invariants, combat
  determinism and degradation, full-turn cycle, ten-turn corruption check,
  save roundtrip.
- Opt-in AI-vs-AI full-campaign simulation
  (`BALANCE=1 npx vitest run src/game/__tests__/balance.test.ts`).
- Headless browser playtest covering selection, movement overlay, attack
  preview + execution, end-turn warnings and a complete AI turn — zero page
  errors.

### Fixed during development

- River bank chains on the odd-r grid contained non-adjacent steps, leaving
  vertex holes units could cross "dry" — found when the AI drove a tank
  division through one and captured Dnipro on turn 1. Banks are now
  validated hex-adjacent "ladders" and the builder asserts the invariant.
- Undefended Dnipro east-bank corridor: added the 110th Territorial Brigade
  (bridgehead garrison) and 128th Mountain Assault Brigade (forest approach),
  bringing Ukraine to 18 starting formations.
- Fog-of-war dimming over friendly rear areas reduced (fog now mainly hides
  enemy information, per the brief); city labels enlarged; favicon added.

### Known limitations

See [README — Known limitations](../README.md#known-limitations): the AI does
not honour fog of war, one scenario, five unit types, desktop WebGL only.
