# Changelog

All notable changes to THEATRE: BLACK EARTH are documented here.

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
