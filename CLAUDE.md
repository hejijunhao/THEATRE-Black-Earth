# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read first

[`docs/overview.md`](docs/overview.md) is the maintained developer orientation
document — architecture diagram, turn-loop sequence, subsystem tour, and a
"where do I change…?" table. Read it before any non-trivial change. This file
covers only the operational essentials and the failure modes that are silent.

Other docs: [`README.md`](README.md) (player-facing rules),
[`docs/changelog.md`](docs/changelog.md) (what was built, per v2 phase),
[`docs/plans/v2-vision.md`](docs/plans/v2-vision.md) (the canonical current
plan — see *Current direction* below),
[`docs/asset-ledger.md`](docs/asset-ledger.md) (procedural-art governance and
the tone review checklist — new art needs a row there),
[`docs/archive/`](docs/archive/) (v1 briefing and superseded v2 drafts).

## Commands

```bash
npm install
npm run dev                 # Vite dev server (default port 5173)
npm run build               # tsc && vite build → dist/
npm test                    # vitest run — 16 rule tests, ~6s
npx tsc --noEmit            # strict typecheck on its own
```

There is **no linter or formatter** in this project. `tsc --noEmit` (strict) is
the only static check; don't go looking for `npm run lint`.

Focused test runs:

```bash
npx vitest run src/game/__tests__/core.test.ts              # one file
npx vitest run -t "stops movement when entering enemy ZOC"  # one test by name
BALANCE=1 npx vitest run src/game/__tests__/balance.test.ts # AI-vs-AI campaign (opt-in, slow)
BALANCE=1 SEEDS=11,42 VERBOSE=1 npx vitest run src/game/__tests__/balance.test.ts
```

`balance.test.ts` is gated by `describe.skipIf(!process.env.BALANCE)` — without
the env var it silently skips (it shows as `1 skipped` in `npm test`). `SEEDS`
overrides the default `11,42`; `VERBOSE=1` logs captures and destructions.

Browser checks (all three launch a local Chrome at the hardcoded macOS path
`/Applications/Google Chrome.app/…`; `puppeteer-core` does not download one):

```bash
npm run dev -- --port 5199          # the scripts hardcode http://localhost:5199
node scripts/playtest.mjs           # selection → attack → end turn → full AI turn
node scripts/golden.mjs             # golden-image regression; --update to re-bless
OUT_DIR=scripts/out node scripts/screenshot.mjs   # visual smoke test; OUT_DIR is required
```

The port matters: `vite.config.ts` sets no `server.port`, so a plain `npm run
dev` listens on 5173 and all three scripts fail to connect.

`scripts/golden/baseline/` is committed; `scripts/golden/current/` and
`scripts/out/` are gitignored. Only re-bless a baseline for an *intended*
visual change, and say so in the commit.

## Architecture in one rule

> The simulation is pure functions over one JSON-serializable `GameState`.
> Rendering only ever reads it.

`src/game/rules/*` mutate an immer draft → `src/game/state/store.ts` is a thin
Zustand dispatcher (`produce(game, draft => rule(draft, ...))`, no logic) →
`src/map/*` (React Three Fiber) and `src/ui/*` (HUD) consume state. The whole
game runs headlessly: `core.test.ts` plays ten full turns with no DOM or WebGL.

Game logic written in `store.ts` or in a component is in the wrong place.

## Invariants that fail silently

These do not throw. Breaking one corrupts campaigns or determinism quietly.

1. **No `Math.random()` / `Date.now()` / `new Date()` anywhere in `src/game/`.**
   RNG state is a number in `GameState.rngState` (mulberry32, `src/game/rng.ts`);
   every draw returns `{ value, next }` and the caller writes `next` back.
   Saves replay identically because of this, and tests assert it. The same
   applies to procedural art in `src/assets/` — seed variation from unit id or
   tile hash, never `Math.random()`.
2. **`GameState` stays JSON-serializable.** No `Map`, `Set`, `Date`, class
   instances or functions — hence the deliberate `riverEdges: string[]` and
   `visibleTiles: TileId[]`.
3. **River banks must be hex-adjacent "ladders."** Rivers live on hex *edges*,
   generated from adjacent (bankA, bankB) pairs on an odd-r pointy-top grid.
   A step like `(10,4) → (11,5)` looks contiguous in column/row arithmetic but
   is **not** adjacent in odd-r, leaving a vertex hole units walk through dry.
   This shipped once: the RU AI drove a tank division through the gap and took
   Dnipro on turn 1. `assertAdjacent()` in `scenarios/build.ts` now enforces it,
   and `rivers.mjs` `validateAndDeriveEdges()` enforces it in the generator.
   Re-read `docs/overview.md` §6 before touching `RIVERS`.
4. **Call `recomputeFog()` after anything that moves a unit or changes tile
   control.** Every order path in the store already does.
5. **One unit per tile** — enforced in the builder, `moveCostInto`, and
   deployment validation.
6. **Bump `SAVE_VERSION`** whenever `GameState`'s shape changes. It is defined
   in `src/game/types.ts` (currently `3`) and merely imported by
   `state/save.ts`; a version mismatch returns `null` rather than half-loading.
7. **Extend `window.__TBE_DEBUG__`** (`useDebugHook()` near the bottom of
   `src/App.tsx`) rather than reaching into the store from automation scripts.
   It is the sanctioned surface and all three browser scripts depend on it.

## Things worth knowing before editing

- **The map is generated data.** `src/game/scenarios/blackEarth2025.ts` is a
  **generated file** (see *Current direction*): three 48×36 ASCII layers
  (`TERRAIN_ROWS`, `CONTROL_ROWS`, `ELEVATION_ROWS`) plus declarative feature
  lists. `build.ts` compiles it and **throws** on any authoring error (bad row
  length, city on water, non-adjacent bank step, bridge off a river edge,
  stacked units, discontiguous corridor). Those assertions are the acceptance
  test for the geodata pipeline — don't soften them. A second scenario needs a
  new data module and an import swap, no engine work.
- **Combat preview and resolution call the same functions** (`attackPower` /
  `defensePower` in `rules/combat.ts`), so the preview is honest by
  construction; resolution adds an explicit 2d6 per side (attack roll =
  damage given, defence roll = damage taken). Add a new factor there and it
  appears in the preview automatically.
- **Encirclement is emergent, not special-cased.** `rules/supply.ts` is a
  budget-depleting flood fill that only crosses friendly-controlled tiles
  (the `nTile.controller !== faction` check, `supply.ts:52`). Taking one tile
  re-derives the whole supply map.
- **The AI is stepwise on purpose.** `stepAI()` executes one queue entry per
  call and returns an `AIActionLog`; `aiQueue`/`aiIndex` live in `GameState`.
  That is what makes the enemy turn watchable without a replay layer, and keeps
  a mid-AI-turn save coherent. The AI does **not** honour fog of war (documented
  limitation, not a bug).
- **No runtime network.** Fonts are bundled via `@fontsource`, audio is
  synthesised in `src/audio/audio.ts`, saves are `localStorage`, and the only
  images are the locally-served HUD material kit in `public/ui/` (loaded by
  `styles.css` as `url('/ui/…')`; see `public/ui/README.md`). Glyphs stay inline
  SVG in `src/ui/icons.tsx`. Keep it that way — no CDNs, no runtime fetches.
- **Miniatures are code, not models.** `src/assets/{parts,vehicles,units}.ts`
  build merged vertex-coloured geometry. Review new factories on the in-app
  turntable at the `#assets` route and add a row to `docs/asset-ledger.md`.

## Editorial stance (a design constraint, not decoration)

The scenario is a deliberately simplified *designed* one, not a reproduction of
live battlefield conditions or real orders of battle. The treatment is
restrained and non-triumphalist; casualties are abstracted into strength /
morale / readiness / war-support. This shapes the combat model (degradation and
retreat, not annihilation) and all UI copy. It also rules out photorealism and
real satellite imagery of actual battlefields, gore, and burning-vehicle
spectacle (the asset-ledger checklist treats this as normative).

## Current direction

**v2 (0.2.0) is implemented** — all six phases A–F of
[`docs/plans/v2-vision.md`](docs/plans/v2-vision.md) shipped 2026-08-03 (see
the changelog for per-phase details and the deliberate deviations; note the
single commit that carried them is titled "Phase A" but contains all six). Key
consequences for future work:

- `src/game/scenarios/blackEarth2025.ts` and `src/map/data/terrainData.ts`
  are **generated** — edit `scripts/geo/design.mjs`/`config.mjs` and rerun
  `node scripts/geo/build-scenario.mjs`, never the outputs. Inspect the result
  with `node scripts/geo/preview.mjs` (ASCII dump of terrain, control, rivers,
  corridors, unit positions).
- **The geodata cache is gitignored.** `scripts/geo/cache/` holds the DEM tiles,
  WorldCover grids and Natural Earth GeoJSON; on a fresh clone
  `build-scenario.mjs` re-downloads them from AWS/ESA/Natural Earth. That is the
  one build-time network dependency in the project, and it is slow. The
  generated outputs are committed, so you rarely need to run it at all.
- The render layer is the v2 stack (continuous terrain mesh, miniatures,
  post chain, parchment political mode). `SAVE_VERSION` is 3.
- Browser scripts need `npm run dev -- --port 5199`. Verify changes with
  `npm test`, `npx tsc --noEmit`, `node scripts/playtest.mjs`, and
  `node scripts/golden.mjs` (re-bless with `--update` on intended visual
  change).
- Colour-space rule for the render layer: sRGB-tagged DataTextures must be
  written with `convertLinearToSRGB()` bytes, or every wash double-darkens.
- New *mechanics* (fog-honouring AI, second scenario, rail redeployment)
  remain the v3 menu.
