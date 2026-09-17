# THEATRE: BLACK EARTH

A compact single-player, turn-based operational strategy game set during the
contemporary war in Ukraine, built as a self-contained browser game.

**v0.2 — The Living Theatre.** The map is now real Ukrainian topography,
hydrography and land cover (derived offline from Copernicus DEM, ESA
WorldCover and Natural Earth, quantised to a 48×36 hex grid); the land is a
continuous lit relief surface with chernozem strip-fields; formations are
procedural miniatures whose silhouette carries their state (`Tab` returns
the classic counters); the political map mode is a parchment staff map. See
[`docs/plans/v2-vision.md`](docs/plans/v2-vision.md) and the
[changelog](docs/changelog.md).

> **Scenario disclaimer.** The map, formations, starting positions and balance
> are a deliberately simplified, *designed scenario* ("Black Earth, Spring
> 2025"). It is not a reproduction of live battlefield conditions, real orders
> of battle or exact geography. The treatment is intentionally serious,
> restrained and non-triumphalist; casualties are represented abstractly
> through strength, morale, readiness and war support.

Built to the product brief in [`docs/archive/v1-briefing.md`](docs/archive/v1-briefing.md).

## Running the game

```bash
npm install
npm run dev        # development server (http://localhost:5173)
npm run build      # production build (dist/)
npm run test       # rule tests (vitest)
npx tsc --noEmit   # strict typecheck
```

No backend, accounts or external services. Saves live in `localStorage`.

### First session (the playable loop)

1. **New campaign** as Ukraine (tutorial on). Skip guidance if you already know the board.
2. Click a friendly formation — movement range highlights.
3. Click a highlighted hex to **move**, or an adjacent enemy (or the Assault plate) to open the **briefing**.
4. Confirm the roll. Each side rolls **2d6**. Read the after-action **dispatch** (Esc to dismiss). Counters show remaining movement; spent plates dim.
5. **End week** (`Shift+Enter` or **End Week** on the top strip). Watch the enemy act, then the week resolves. Journal `J`, dossier `I`, encyclopedia `E`.
6. The campaign ends on decisive objectives, war-support collapse, army destruction, or turn 36.

Browser smokes (need a local Chrome/Chromium; playtest/golden hardcode port **5199**):

```bash
npm run dev -- --port 5199
node scripts/playtest.mjs                      # select → attack with 2d6 → end turn → AI
BALANCE=1 npx vitest run src/game/__tests__/balance.test.ts   # AI-vs-AI campaign
```

`CHROME_PATH` overrides the browser binary if it is not in a default location.

## Controls

| Input | Effect |
| --- | --- |
| Left-drag / scroll | Pan / zoom the theatre |
| Right-drag | Tilt / rotate (limited) |
| Click own formation | Select it (movement range appears) |
| Click highlighted hex | Move there (capturing ground you pass through) |
| Click adjacent enemy | Open the assault briefing; confirm to attack (2d6 each) |
| After-action report | Dice, damage given/taken, strength before → after |
| `Esc` | Dismiss report / cancel targeting / deselect |
| `Shift+Enter` | End turn |
| `Tab` | Toggle miniatures / classic counters |

Bottom-left: map modes (Political, Supply, Terrain, Objectives, Intelligence).
Bottom-center: Reinforce, Entrench, Operations, Reserves, End Turn.
Top bar: turn/date, weather, manpower, equipment, command, war support, score.
Almost every value has an explanatory tooltip.

## The game in five ideas

1. **Territory matters** — cities carry victory points; decisive objectives can
   end the campaign early; captured ground shifts war support.
2. **Supply matters** — supply floods from national sources through friendly
   territory along roads and rail. Cut-off formations fight at half power and
   wither; the Supply map mode shows exactly why.
3. **Preparation matters** — entrenchment accumulates for stationary troops,
   artillery preparation strips it, reconnaissance sharpens combat previews,
   and attacking across rivers without a bridge is punished.
4. **Formations have limits** — strength, readiness and morale all degrade
   under pressure and recover only in supply; rotation and reinforcement are
   how armies survive.
5. **The frontline is never static** — zones of control make lines cohesive
   and encirclement lethal; retreat, disorganisation and overextension are
   modelled cheaply but they bite.

## Rules summary

- **Turns** are weekly, alternating: player phase → AI phase → global
  resolution (supply, attrition, reinforcement, recovery, weather, events).
  A campaign is adjudicated after 36 turns if no decisive outcome occurs.
- **Movement** uses movement points over hex terrain (roads flatten cost,
  weather adds friction, river edges cost extra except at bridges). Entering an
  enemy zone of control costs +1 MP and ends movement.
- **Combat**: effective power = base stat × strength × readiness × morale ×
  supply × terrain/support modifiers. Confirming an attack rolls **2d6** for
  each side: the attack roll decides damage given, the defence roll decides
  damage taken (a 7 is average). The after-action report shows the dice,
  odds, and strength before → after. Defenders usually degrade and retreat
  rather than die; units that cannot retreat risk destruction — encirclement
  works.
- **Artillery** supports attacks from adjacent hexes and can bombard directly
  (degrading, never capturing).
- **Supply states** (full → supplied → strained → low → isolated) scale
  combat power, movement and recovery. Sustained isolation causes attrition.
- **Resources**: manpower and equipment fund reinforcement and reserve
  deployment; command points fund six strategic operations (recon sweep,
  artillery preparation, close support, emergency resupply, rapid
  reinforcement, fortify position) with per-faction costs; war support is the
  political clock — if it collapses, the war is lost regardless of the map.
- **Fog of war** hides enemy formations outside observation; stale sightings
  decay through ghost markers (contact → type → unknown). Terrain, cities and
  territorial control always remain visible.
- **Victory**: decisive objectives (UA: Melitopol + Mariupol; RU: Kharkiv +
  Zaporizhzhia), war-support collapse, army destruction — or a campaign-score
  comparison at the turn limit (operational victory / stalemate / defeat).

## Architecture

Simulation and rendering are strictly separated. The rules are pure functions
over a serializable `GameState`; the Zustand store is a thin dispatcher; the
React Three Fiber map and the React HUD only *consume* state.

```
src/
  game/
    types.ts          all simulation types (JSON-serializable state)
    hex.ts            odd-r offset hex math + world layout
    rng.ts            seeded RNG (mulberry32) stored inside GameState
    data/             unit/terrain/weather/operation/event definitions
    scenarios/        ASCII-layer scenario data + validating builder
    rules/            movement+ZOC, combat, supply, fog, ops, events,
                      victory, weather, turn resolution
    ai/               transparent heuristic AI (stepwise, presentable)
    state/            Zustand store + save/load (versioned localStorage)
  map/                R3F scene: instanced hex tiles, rivers, roads,
                      frontline ribbon, unit counters, overlays, weather
  ui/                 HUD: top bar, context panel, command bar, modals,
                      notifications, tutorial, main menu (custom CSS system)
  audio/              procedural WebAudio ambience + cues (no asset files)
```

Design notes:

- **Determinism.** The RNG state lives in `GameState`, so saves replay
  identically and combat is reproducible; the test suite asserts it.
- **Data-driven scenario.** The map is two ASCII layers (terrain + control)
  plus feature lists (cities, river bank chains, road/rail corridors, unit
  placements). The builder validates every adjacency claim at startup, so
  authoring mistakes fail loudly. A second scenario would need no engine work.
- **Rivers** live on hex *edges*, generated from two parallel bank chains;
  the builder enforces that banks are hex-adjacent "ladders" so the river is
  watertight.
- **AI** plans a queue and executes one visible step per tick, which is what
  makes the enemy turn watchable (camera focus, action banner, skip button)
  without a separate presentation layer.
- **Saves** are versioned (`SAVE_VERSION`); incompatible saves are ignored
  rather than half-loaded. Autosave every turn + three manual slots.

## Known limitations

- The AI has full knowledge of the map (it does not honour fog of war); it is
  a transparent heuristic, not a planner. It defends, masses, probes and
  rotates, but it will not orchestrate deep multi-turn operations.
- Balance is tuned for plausibility, not competitive symmetry: AI-vs-AI runs
  end anywhere between hard stalemate and a mid-campaign decisive collapse.
- Single scenario, two factions, five unit types; naval and air power exist
  only as strategic operations. Hot-seat and simultaneous turns are out of
  scope, as per the brief.
- Combat previews against unobserved defenders show estimates without
  displaying uncertainty bounds numerically (a recon sweep resolves this).
- WebGL is required; the game targets desktop browsers, not mobile.

## Future extension ideas

- A second scenario (e.g. 2022 opening phase) reusing the engine unchanged.
- AI operational "plans" (multi-turn axis selection) and fog-honouring AI.
- Rail movement as a distinct strategic redeployment action.
- Weather fronts as regional rather than theatre-wide states.
- Replay viewer built on the deterministic action log.
