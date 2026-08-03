# THEATRE: BLACK EARTH — v2 Vision: *The Living Theatre*

> Status: **proposal** · Written 2026-08-02 · Companion to [`overview.md`](../overview.md)
> and the original [`v1-briefing.md`](../archive/v1-briefing.md).
> A parallel report ([`v2-vision.md`](v2-vision.md)) was drafted independently in
> another session; the two are intentionally separate takes on the same brief.

v1 proved the game. The simulation is deterministic, testable, and complete: a
36-turn campaign with honest combat previews, emergent encirclement, and a
watchable AI. But it *looks* like what it is — a debug view that grew a soul.
Flat-shaded hex cylinders, cone trees, box buildings, billboard counters.

**v2 keeps the simulation almost untouched and rebuilds the presentation to the
standard of a modern Paradox title.** The reference points are Victoria 3's
painterly terrain and framed UI, Victoria 2's paper political map, and
Civilization 6's readable 3D miniatures — filtered through the sober,
restrained tone this subject demands.

---

## 1. North star

What the player should see when they open v2:

> The camera drifts in low over the Dnipro at first light. The land below is
> not a grid of plastic hexes but a continuous, gently rolling landscape: black
> chernozem fields in long strip-cultivated bands of ochre and green, shelter
> belts of trees stitched between them, the river a broad, slow, light-catching
> ribbon with reeds at its banks. Kharkiv sprawls organically — panel-block
> mikrorayons, industrial sheds, a landmark silhouette at its heart — its name
> set in quiet serif capitals above it. A mechanized brigade is not a cardboard
> counter but a small column of tanks on a subtle faction-coloured base, a
> standard floating above it carrying its NATO symbol and strength. The
> frontline is a scarred, hatched seam across the land. Overcast light, long
> soft shadows, mist pooling in the valleys at the map's edge where the theatre
> fades into the unmodeled beyond. Zoom out, and the world quietly becomes a
> staff map — flat colours, paper grain, arcing labels. Zoom in, and it becomes
> terrain again.
>
> It reads instantly as *operational command*, and it is beautiful the way a
> good relief map is beautiful — not the way a cartoon is.

The one-sentence pitch: **v1 rendered the state; v2 renders the theatre.**

---

## 2. What we take from each reference

The three images in [`docs/refs/`](../refs/) each contribute something
specific — and each has something we deliberately leave behind.

### Victoria 3 (terrain + UI screenshot)

**Take:**
- Terrain as one continuous painterly landscape — no visible tile seams;
  elevation, forests, fields and cities all sit *in* the land, not *on* it.
- Cities as organic sprawl that grows from the map rather than icons placed
  on it; visible infrastructure (rail lines curving through the countryside).
- The map as a physical model on a table: soft depth of field and fog at the
  edges frame the playable area instead of an abrupt cliff.
- UI as *furniture*: heavy, consistent framing; a right-hand journal of active
  objectives; panels that feel designed rather than styled.

**Leave:** the Victorian ornament. Gilded scrollwork is right for 1836 and
wrong for 2025. Our equivalent register is the **operations room**: matte
steel, olive drab, stencilled type, paper maps under glass.

### Victoria 2 (paper political map)

**Take:**
- The political map as *artifact* — flat sovereign colour fills, paper grain,
  serif labels arcing across territory, borders that look drawn rather than
  computed. This becomes our **Political map mode**, reimagined as a modern
  staff map (the thing that actually hangs in a command post).
- The confidence to make a map mode a complete visual *lens*, not a colour
  swap on the same geometry.

**Leave:** nothing, really — this is the cheapest, highest-character idea in
the set.

### Civilization 6 (terrain + units screenshot)

**Take:**
- **Units rendered as what they are.** Civ's warriors and catapults are read
  at a glance from a high camera. Our mechanized brigades become small columns
  of vehicles, artillery gets guns with raised barrels, infantry gets figures.
- Miniatures on bases: Civ units stand on the ground but read as *pieces*;
  we keep v1's faction-coloured base plate as a miniature-wargaming base — it
  carries selection glow and faction identity without painting the vehicles
  toy colours.
- Border ribbons with real graphic quality, and terrain that stays readable
  at every zoom.

**Leave:** the theme-park palette and toy proportions. Civ 6 is joyful;
that is exactly the wrong note here. We take its *readability engineering*,
not its tone.

---

## 3. Design pillars

Every v2 decision gets tested against these five, in order:

1. **Readability first, painterliness second.** This is an operational
   wargame; if a change makes supply state, terrain class or unit strength
   harder to read from the default camera, it is wrong no matter how good it
   looks. Every beauty pass ships with a legibility check at three zoom levels.
2. **Sober realism, not photorealism.** Muted palette, overcast Eastern
   European light, materials that suggest rather than simulate. Target: a
   hand-built terrain model in a war museum, lit by a north-facing window.
   Never: a rendered drone photograph of a real battlefield.
3. **The Paradox zoom metaphor.** Close = living terrain with miniatures.
   Far = staff map with counters. The transition is continuous and the player
   never has to choose — distance *is* the map mode dial.
4. **Asset-light and deterministic, still.** v1 ships zero image/model files —
   everything is procedural. v2 keeps that discipline: terrain textures are
   generated, unit miniatures are **code** (procedural `THREE.Group` factories,
   img2threejs-style), decoration placement derives from `hashSeed`. The
   bundle stays small, diffs stay reviewable, and nothing in the view layer
   touches `Math.random()`.
5. **Restraint about the war.** No bodies, no gore, no triumphal spectacle.
   Combat presentation is brief and abstract: muzzle flashes, smoke, dust.
   Damage is shown as *terrain wear* — craters, burnt field patches, scarred
   urban blocks — that fades over turns. The v1 editorial stance is a hard
   constraint on the art direction, not a suggestion.

---

## 4. Where v1 actually stands (gap analysis)

| Layer | v1 today | Gap to reference |
| --- | --- | --- |
| Ground | 332 extruded hex cylinders, one `InstancedMesh`, flat-shaded, colour-baked (`Tiles.tsx`) | Reads as a board, not a landscape; hard tile seams; elevation is stepped pillars |
| Water | Flat dark hexes at y=0.06 | No shore, no depth gradient, no motion |
| Rivers | Line segments along hex edges (`Rivers.tsx`) | Straight polylines; no meander, width, or flow |
| Vegetation | 3–5 flat-shaded cones per forest tile | Silhouette-only trees; plains are empty colour |
| Cities | Jittered grey boxes + name sprite (`Decorations.tsx`) | No architectural identity, no sprawl by size, no landmarks |
| Units | Billboard canvas counter + coloured block (`Units.tsx`, `textures.ts`) | Insignia only — the user explicitly wants the tank to *be* a tank |
| Frontline/borders | Ribbon (`Frontline.tsx`) | Serviceable; needs graphic quality + contested hatching |
| Map modes | Colour reinterpretation of the same mesh (`palette.ts`) | No mode is a true lens; political mode especially undersells |
| Light/atmosphere | Hemisphere + one directional, exp fog per weather (`MapScene.tsx`) | No AO, no grade, no sky, abrupt map edge |
| HUD | Clean custom CSS (`ui/styles.css`) | Functional but generic; no design language, no iconography set, no framing |

The good news: because rendering only ever reads `GameState`, **every row of
this table can be rebuilt without touching a single rule file.** v2 is almost
entirely a `src/map/` + `src/ui/` project.

---

## 5. The workstreams

### A. The Living Map — terrain rebuild

The single biggest visual delta in the whole plan.

- **Continuous heightfield.** Replace tile cylinders with one subdivided
  ground mesh (~200×140 verts to start). Vertex heights = smoothly
  interpolated tile elevations + low-amplitude deterministic fBm detail
  (seeded from tile ids via `hashSeed`). Hexes stop being geometry and become
  a **shader overlay**: a thin grid line pass plus per-tile control tint,
  fadeable by camera distance and toggleable outright. Picking moves from
  per-instance raycast to world-position → `worldToTile` inverse math
  (the function already exists in `hex.ts`).
- **Splat-blended ground texture.** Per-tile terrain class writes weights into
  a splat map; a custom shader blends 4–5 procedural albedo layers, all
  canvas-generated at load: chernozem **strip-field patchwork** for plains
  (the iconic long ochre/green/black bands of Ukrainian agriculture — this is
  the signature look of the theatre and the title of the game), steppe grass,
  forest floor, urban concrete/asphalt, marsh sheen. Field strips orient
  per-tile from the seed so the patchwork shifts direction region to region.
- **Rivers with a course.** Keep the edge-ladder data (and its invariant!) as
  the *hydrological truth*, but render from a Catmull-Rom spline fitted along
  the edge midpoints: meander, width classes (Dnipro reads 3× wider than the
  Oskil), a slight carved channel in the heightfield, animated flow in the
  material, reed clumps at low-slope banks. Bridges become small models —
  road and rail variants — and blown/contested crossings can read visually.
- **The sea.** Depth-gradient colour from shore, gentle animated normal
  ripple, a soft foam line at the coast, sun lane under clear weather.
  The Sea of Azov should feel like a real edge of the theatre, not a border
  of dark hexes.
- **Roads and rail as decals** conforming to the heightfield — dirt roads,
  paved highways, rail with sleeper dashes — replacing floating line
  segments. Rail visibly distinct because rail supply (0.5 cost) is a
  strategic fact the player should absorb by *looking*.
- **Map edge.** The theatre fades out Vic3-style: desaturation + fog banks +
  a subtle vignette of unmodeled terrain beyond the playable frame, replacing
  the abrupt `GroundPlane` slab.

### B. Settlements with identity

- **Regional architecture kit** (all instanced, all procedural): Soviet-era
  panel-block slabs for mikrorayons, single-family houses with pitched roofs,
  industrial sheds and warehouse rows, grain elevators for rail towns, port
  cranes for Mariupol/Berdyansk, cooling towers for Enerhodar, an abstracted
  landmark silhouette per capital/major city (Derzhprom for Kharkiv, the
  Dnipro river arch, etc. — restrained, low-poly, recognisable in outline).
- **Sprawl scales with city size.** Capital > major > town footprints,
  deterministic layout from the city seed, densest at centre. Cities sit in a
  small clearing of the field patchwork with local road capillaries.
- **Fortifications that look like 2020s fortifications**: zigzag trench-line
  decals plus instanced dragon's-teeth rows replacing the flat hex ring.
- **Battle wear.** Tiles that hosted combat get deterministic crater and burn
  decals that fade over several turns (needs a tiny `recentCombat` log on
  tiles — one of only two sim-adjacent data additions in the plan, bump
  `SAVE_VERSION`). Urban blocks in fought-over cities swap to damaged
  variants. Sober, unspectacular, informative: you can *see* where the front
  has been grinding.

### C. Units as what they are — the miniatures system

The user's headline request, and the plan's second pillar deliverable.

- **One miniature group per unit type**, procedurally authored as `THREE.Group`
  factory functions (the img2threejs method: reference image → staged
  code-only generation → vision-reviewed against the reference → committed as
  TypeScript). No GLB/FBX files; models are code, diffable and
  tree-shakeable:
  - *Mechanized* — three tanks in echelon
  - *Infantry* — a squad of simple stylized figures (deliberately abstract;
    silhouette-level detail only, per pillar 5)
  - *Artillery* — self-propelled guns, barrels raised
  - *Recon* — light vehicles spaced wide
  - *Airmobile* — vehicles + a helicopter silhouette on the base
  Faction reads from the **base plate**, not vehicle paint: v1's coloured
  block becomes a proper wargaming base (oval, faction edge light, selection
  glow), so vehicles stay realistic-muted and the game stays colour-readable.
- **The standard.** Above each miniature floats a compact banner (Paradox
  model-plus-flag metaphor): NATO symbol, designation, strength bar, status
  pips — a distilled version of today's counter plate from `textures.ts`.
- **Zoom LOD crossfade.** Near: miniatures + slim standards. Far: miniatures
  fade down, the full v1-style counter fades up. The beloved counter *is* the
  far-LOD — nothing from v1 is thrown away.
- **Motion, restrained.** Movement: the column advances tile-by-tile along
  the actual path with a small dust wake (v1 already lerps; this upgrades the
  read). Combat: brief muzzle flashes, smoke puffs, a low screen-space rumble
  — two seconds, no ragdolls, no bodies. Retreats visibly *withdraw*.
  Destruction: the standard lowers and the miniature fades under smoke.
- **Intel ghosts** become grey **silhouettes** — unlit, slightly transparent,
  dashed base, "?" on the standard at low intel levels — decaying in presence
  exactly as `decayIntel()` decays the record.

### D. Map modes as lenses

Five modes stop being palette swaps and become five *treatments*:

- **Political → The Staff Map.** The Vic2 homage: the whole scene transitions
  to a flat paper rendering — parchment grain, muted sovereign fills, hatched
  occupation zones, borders drawn with a cartographer's line weight, city
  labels in engraved serif arcing where regions allow, front line as a
  hand-drawn red seam. Implemented as an alternate render path (paper shader
  on the terrain mesh + counters-only units), crossfaded like a Paradox
  map-mode switch.
- **Supply** — animated dashed flow along actual supply paths out of sources
  and hubs, thinning with budget, choke tiles pulsing; isolated pockets
  visibly starve. (The flood-fill in `supply.ts` already computes everything
  this needs.)
- **Intelligence** — the world dims to a cool surveillance grade; vision
  radii as soft light pools; ghost ages as isolines.
- **Objectives** — VP cities lit like beacons with score deltas; everything
  else recedes.
- **Terrain** — the naturalistic view *is* the terrain mode; this becomes the
  default.

### E. Atmosphere, camera, post

- **Light:** overcast key with warm low-angle sun breaking through per
  weather; PCF soft shadows; hemispheric bounce tuned per season.
- **Post-processing** (via `@react-three/postprocessing`): SSAO (N8AO),
  very gentle bloom reserved for fires/flashes, filmic tonemapping, a subtle
  per-weather colour grade (mud season sits desaturated olive-brown; snow
  sits blue-grey; clear spring gets one notch of warmth). No grain overdose,
  no chromatic aberration — museum model, not music video.
- **Sky and weather:** gradient sky dome, drifting cloud-shadow patches on
  the ground (cheap: a scrolling noise texture on the light), upgraded rain
  streaks/snow with wind direction, wet-sheen specular on roads during mud.
- **Camera:** pitch curve tied to zoom (near-oblique → far-top-down),
  inertial pan, gentle collision with terrain height, and the LOD/lens
  transitions hung off well-defined zoom breakpoints in `CameraRig.tsx`.

### F. The Operations Room — HUD redesign

- **Design language:** matte dark steel + olive drab, paper-texture panel
  fills, one stencil display face + one humanist serif for body, an engraved
  SVG icon set (supply, entrenchment, morale, readiness, CP, VP…) replacing
  emoji/text glyphs. Heavy, consistent panel framing — Vic3's furniture
  quality in a 2025 register.
- **The Journal** (Vic3's best UI idea, directly adapted): a right-side stack
  of active objectives/operations with progress bars — decisive cities, war
  support trajectory, active ops cooldowns, incoming events.
- **Unit panel:** the miniature rendered live in a small viewport, factor
  breakdown with icons (the honest `CombatFactor` list is a v1 crown jewel —
  give it the typography it deserves).
- **Event windows:** framed like briefing documents — stamped header,
  monochrome vector vignette art (procedural/SVG, keeping the no-binary-asset
  rule), choices as signed orders.
- **Turn transition:** a brief letterboxed "TURN 14 · APRIL · MUD" title card
  with weather grade shift — the Paradox month-tick feel.
- **Main menu:** the live map at dawn, slow drift, title in stencil.

### G. Asset governance & tooling (what the linked resources contribute)

- **img2threejs** ([link below](#resources)) is the authoring pipeline for
  every miniature and landmark: reference photo → staged procedural
  generation → vision-based QA loop → committed TS factory. Its quality-gate
  discipline is the answer to "procedural models usually look bad."
- **Vesperfall's asset catalog** is the governance model: we add
  `docs/asset-ledger.md` plus a dev-only in-app `/assets` route rendering
  every factory on a turntable with status (`runtime` / `review` / `fallback`),
  reference image link, and QA result. No asset ships unreviewed; no orphan
  assets accumulate.
- **MengTo/Skills** is the process model: check in repo-local skills
  (`.claude/skills/`) for the recurring workflows — "author a miniature,"
  "legibility check at three zooms," "visual regression pass" — so any agent
  session regenerates assets the same way. Their three.js game-architecture
  skills are also worth mining directly.
- **GeoLibre / geolibre.app** is the cartographic reference library:
  hillshade ramps, landcover palettes, scale-dependent styling and labeling
  rules from real GIS practice inform the staff-map lens and terrain palette.
  (MapLibre-style expression-based styling is a good mental model for our
  `palette.ts` growing into a real style system.) If we ever want the
  heightfield informed by real regional DEM *character* — rolling steppe
  wavelengths, river valley profiles — this is the toolchain to study, while
  the map itself stays a **designed scenario**, per the v1 stance.
- **Visual regression:** `scripts/screenshot.mjs` grows into a golden-image
  harness — one shot per map mode × weather × zoom tier, diffed in CI. The
  deterministic RNG-in-state design means these images are perfectly
  reproducible; almost no other game gets visual regression this cheap.

---

## 6. Technical ground rules

1. **The architecture does not move.** Rules stay pure, the store stays a
   dispatcher, rendering stays read-only. v2 is `src/map/` + `src/ui/` +
   `src/assets/` (new: miniature/landmark factories).
2. **Two sim-adjacent data additions only**, both view-motivated, both
   `SAVE_VERSION` bumps: a small per-tile `recentCombat` decay counter
   (battle wear), and optional `landmark` tags on cities. Nothing else in
   `GameState` changes.
3. **Determinism extends to the view.** All placement/variation seeds from
   `hashSeed`; shader time is the only animated input. Golden screenshots
   stay byte-comparable.
4. **Performance budget:** 60 fps on a mid integrated GPU at 1080p.
   Draw-call budget ≤ ~150 (everything instanced or merged), one terrain
   drawcall, texture memory ≤ 64 MB all-procedural, and a `quality` setting
   (post off / shadows down / miniatures→counters) as the escape hatch.
5. **Bundle discipline:** no binary model/texture assets. If a generated
   texture is expensive to compute, bake it to a canvas once at load — not to
   a shipped PNG.
6. **Testing:** `npm test` untouched and green throughout; playtest script
   keeps passing; the golden-image harness is the new visual gate.

---

## 7. Phasing

Each phase is independently shippable and leaves the game *better looking
than the last*, never half-migrated.

| Phase | Name | Contents | Done when |
| --- | --- | --- | --- |
| **V2.0** | *The Living Map* | Heightfield terrain, splat texturing + field patchwork, spline rivers, sea, road/rail decals, map-edge treatment, border ribbon upgrade | The default view reads as a landscape; all 16 tests + playtest green; 60 fps budget held |
| **V2.1** | *Miniatures* | Five unit-type factories via img2threejs loop, base plates + standards, LOD crossfade to counters, movement/combat/destruction presentation, silhouette ghosts, asset ledger + `/assets` route | A tank brigade looks like tanks at default zoom and a counter at far zoom; ghost decay legible |
| **V2.2** | *The Operations Room* | HUD design language, icon set, journal, unit panel with live miniature, event briefing windows, turn card, main menu | No unstyled surface remains; UI passes the three-zoom legibility check |
| **V2.3** | *Lenses & Weather* | Staff-map political mode, supply flow animation, intel/objectives treatments, seasons/wear (battle scarring, mud sheen, snow), post-processing grade, sky | Map-mode switches feel like Paradox lens changes; a full campaign's front line is readable as terrain wear |

Sequencing logic: terrain first because every other layer sits on it and it is
the largest single delta; miniatures second because it is the user's explicit
ask; UI third because it frames everything; lenses/weather last because they
polish systems the earlier phases created.

---

## 8. Non-goals

- **No photorealism** and no real satellite imagery of actual battlefields.
- **No depiction of human suffering** — the pillar-5 line is hard.
- **No claim to real orders of battle** — miniatures are typed archetypes,
  not equipment identification.
- **No new simulation mechanics** in v2 (a fog-honouring AI, second scenario,
  rail redeployment etc. remain the *v3* menu — this release is presentation).
- **No runtime network assets** — the game stays fully self-contained.

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| Procedural models plateau at "programmer art" | img2threejs staged QA loops with vision review; asset ledger review gate; landmark list kept short |
| Integrated-GPU performance | Hard draw-call budget, instancing-only rule, quality toggle, LOD crossfades |
| Tone drift toward "war as toy" as fidelity rises | Style-bible checklist in the asset ledger; muted vehicle paint; pillar 5 reviewed per phase |
| Scope creep across phases | Each phase shippable alone; golden-image + test gates per phase |
| Hex-picking regression when tiles stop being meshes | `worldToTile` inverse already exists; covered by playtest script before the cylinder mesh is removed |

---

## 10. Resources

Reference material and tools shared for this plan — keep these links:

- **GeoLibre (repo):** https://github.com/opengeos/GeoLibre — open-source GIS
  platform (MapLibre GL JS, deck.gl, DuckDB-WASM); cartographic styling and
  terrain-rendering reference. MIT.
- **GeoLibre (app):** https://geolibre.app/ — live demonstration of its
  renderers, symbology and 3D terrain handling.
- **MengTo/Skills:** https://github.com/MengTo/Skills — 118 reusable agent
  workflow skills, incl. three.js game architecture and asset-review
  workflows; the process model for our repo-local skills. MIT.
- **Vesperfall asset catalog:** https://vesperfall.mengto.chatgpt.site/asset-catalog
  — exemplar runtime asset ledger (status-tagged inventory for art review);
  the governance model for our `docs/asset-ledger.md`.
- **img2threejs:** https://github.com/img2threejs/img2threejs — reference
  image → procedural, quality-gated, animation-ready three.js models as code;
  the authoring pipeline for unit miniatures and city landmarks.

Reference images (in [`docs/refs/`](../refs/)):

- `0141680_0-763411239.jpg` — Victoria 3: painterly terrain, journal UI
- `1ddmzol3miv91-3777682919.jpg` — Victoria 2: paper political map
- `ss_f501156a69223131ee8b12452f3003698334e964.1920x1080-408268194.jpg` —
  Civilization 6: stylized terrain, units as miniatures
