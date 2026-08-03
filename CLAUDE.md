# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read first

[`docs/overview.md`](docs/overview.md) is the maintained developer orientation
document — architecture diagram, turn-loop sequence, subsystem tour, and a
"where do I change…?" table. Read it before any non-trivial change. This file
covers only the operational essentials and the failure modes that are silent.

Other docs: [`README.md`](README.md) (player-facing rules),
[`docs/changelog.md`](docs/changelog.md) (what was built),
[`docs/plans/v2-vision.md`](docs/plans/v2-vision.md) (the canonical current
plan — see *Current direction* below), [`docs/archive/`](docs/archive/)
(v1 briefing and superseded v2 drafts).

## Commands

```bash
npm install
npm run dev                 # Vite dev server (default port 5173)
npm run build               # tsc && vite build → dist/
npm test                    # vitest run — 16 rule tests, ~2s
npx tsc --noEmit            # strict typecheck on its own
```

Focused test runs:

```bash
npx vitest run src/game/__tests__/core.test.ts     # one file
npx vitest run -t "stops movement when entering enemy ZOC"   # one test by name
BALANCE=1 npx vitest run src/game/__tests__/balance.test.ts  # AI-vs-AI campaign (opt-in, slow)
```

`balance.test.ts` is gated by `describe.skipIf(!process.env.BALANCE)` — without
the env var it silently skips.

Browser checks (need a local Chrome at the macOS default path; `puppeteer-core`
does not download a browser):

```bash
npm run dev -- --port 5199          # the scripts hardcode http://localhost:5199
node scripts/playtest.mjs           # selection → attack → end turn → full AI turn
OUT_DIR=scripts/out node scripts/screenshot.mjs   # visual smoke test; OUT_DIR is required
```

The port matters: `vite.config.ts` sets no `server.port`, so a plain `npm run
dev` listens on 5173 and both scripts fail to connect.

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
   Saves replay identically because of this, and tests assert it.
2. **`GameState` stays JSON-serializable.** No `Map`, `Set`, `Date`, class
   instances or functions — hence the deliberate `riverEdges: string[]` and
   `visibleTiles: TileId[]`.
3. **River banks must be hex-adjacent "ladders."** Rivers live on hex *edges*,
   generated from adjacent (bankA, bankB) pairs on an odd-r pointy-top grid.
   A step like `(10,4) → (11,5)` looks contiguous in column/row arithmetic but
   is **not** adjacent in odd-r, leaving a vertex hole units walk through dry.
   This shipped once: the RU AI drove a tank division through the gap and took
   Dnipro on turn 1. `build.ts:44` now asserts it. Re-read `docs/overview.md`
   §6 before touching `RIVERS`.
4. **Call `recomputeFog()` after anything that moves a unit or changes tile
   control.** Every order path in the store already does.
5. **One unit per tile** — enforced in the builder, `moveCostInto`, and
   deployment validation.
6. **Bump `SAVE_VERSION`** (`src/game/state/save.ts`) whenever `GameState`'s
   shape changes. A version mismatch returns `null` rather than half-loading.
7. **Extend `window.__TBE_DEBUG__`** (`useDebugHook`, `src/App.tsx:127`) rather
   than reaching into the store from automation scripts. It is the sanctioned
   surface and both browser scripts depend on it.

## Things worth knowing before editing

- **The map is data.** `src/game/scenarios/blackEarth2025.ts` is two 26×17 ASCII
  layers plus feature lists; `build.ts` compiles it and **throws** on any
  authoring error (bad row length, city on water, non-adjacent bank step,
  bridge off a river edge, stacked units, discontiguous corridor). Authoring
  mistakes fail at startup by design — don't soften those assertions. A second
  scenario needs a new data module and an import swap, no engine work.
- **Combat preview and resolution call the same functions** (`attackPower` /
  `defensePower` in `rules/combat.ts`), so the preview is honest by
  construction; resolution only adds a ±10% seeded swing. Add a new factor there
  and it appears in the preview automatically.
- **Encirclement is emergent, not special-cased.** `rules/supply.ts` is a
  budget-depleting flood fill that only crosses friendly-controlled tiles
  (`supply.ts:52`). Taking one tile re-derives the whole supply map.
- **The AI is stepwise on purpose.** `stepAI()` executes one queue entry per
  call and returns an `AIActionLog`; `aiQueue`/`aiIndex` live in `GameState`.
  That is what makes the enemy turn watchable without a replay layer, and keeps
  a mid-AI-turn save coherent. The AI does **not** honour fog of war (documented
  limitation, not a bug).
- **No runtime network.** Fonts are bundled via `@fontsource`, audio is
  synthesised in `src/audio/audio.ts`, there are no image assets, saves are
  `localStorage`. Keep it that way.

## Editorial stance (a design constraint, not decoration)

The scenario is a deliberately simplified *designed* one, not a reproduction of
live battlefield conditions or real orders of battle. The treatment is
restrained and non-triumphalist; casualties are abstracted into strength /
morale / readiness / war-support. This shapes the combat model (degradation and
retreat, not annihilation) and all UI copy. It also rules out photorealism and
real satellite imagery of actual battlefields.

## Current direction

**v2 (0.2.0) is implemented** — all six phases A–F of
[`docs/plans/v2-vision.md`](docs/plans/v2-vision.md) shipped 2026-08-03 (see
the changelog for per-phase details and the deliberate deviations). Key
consequences for future work:

- `src/game/scenarios/blackEarth2025.ts` and `src/map/data/terrainData.ts`
  are **generated** — edit `scripts/geo/design.mjs`/`config.mjs` and rerun
  `node scripts/geo/build-scenario.mjs`, never the outputs.
- The render layer is the v2 stack (continuous terrain mesh, miniatures,
  post chain, parchment political mode). `SAVE_VERSION` is 3.
- Browser scripts need `npm run dev -- --port 5199`. Verify changes with
  `npm test`, `npx tsc --noEmit`, `node scripts/playtest.mjs`, and
  `node scripts/golden.mjs` (re-bless with `--update` on intended visual
  change).
- Colour-space rule for the render layer: sRGB-tagged DataTextures must be
  written with `convertLinearToSRGB()` bytes.
- New *mechanics* (fog-honouring AI, second scenario, rail redeployment)
  remain the v3 menu.
