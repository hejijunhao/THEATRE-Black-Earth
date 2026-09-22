# Terrain and unit fidelity · 22 September 2026

[Open the visual review](fidelity.html). The comparison and close-ups are captures of the running game, with counters off. This pass supersedes the earlier decision to retain the large armour shapes and simple support models.

- Rebuilt tank cheeks and tank/IFV turrets as multi-section armour shapes. Added small chamfers to larger vehicle parts so edges catch light.
- Activated the existing per-part roughness and metalness data with a shared standard material. Paint, metal, rubber, optics and canvas now respond differently to light. Added filtered paint variation, lower-hull dust and a locally generated reflection environment.
- Replaced infantry and logistics props. Soldiers have rounded anatomy, bent arms, three deterministic poses, boots, faces, helmets, webbing, packs and multi-part rifles. Trucks have three axles, wheel hubs, engine hoods, glazed cabs, mirrors, grilles, steps and bowed canvas covers.
- Preserved rigid prop anchors through geometry merging. Individual figures and trucks sample their own ground height; instanced fighting vehicles also align to the local slope. The previous formation-wide hover offset is removed.
- Shortened field parcels and varied pasture/stubble color, narrowed headlands, removed the repeated sinusoidal parcel relief, increased terrain sampling, and added filtered soil breakup and paired tractor runs. Wet soil has patchy roughness.
- Replaced solid crowns with crossed, alpha-tested leaf sprays. Added roof courses, ridge caps, gutters, chimney caps and foundations. River channels now have animated ripple normals and lower roughness than their banks.
- Fitted the sun's shadow bounds to the visible ground and enabled closer inspection by reducing minimum camera distance from 7 to 4.2.

Validation: production build passes, with the existing large-chunk warning. **112 tests pass**, and the opt-in campaign balance test remains skipped. The material test now checks the PBR material; the soil brightness gate permits the intentionally richer crop palette. A formation integration check verifies material data, rigid anchors, finite positions and the support-geometry budget. Browser gameplay checks passed terrain picking, selection, movement, combat preview/resolution, and a full AI turn without page errors.

Visual coverage includes campaign, operational and close cameras; all five unit classes; both factions; selection; clear/rain/snow; political mode; counters; and the asset review. The capture script fails on browser or shader errors. Historical golden images are unchanged; this is an intentional visual revision, not a claim that the old pixel baselines match.

These remain procedural, static strategy miniatures. Infantry poses are not skeletal animations, settlement archetypes still repeat, and river beds remain draped geometry. Lower-end GPU performance has not been benchmarked. Leaf-card overdraw and denser support models are the main additional rendering costs; the main fighting vehicles remain instanced.

Reproduce with the local server on port 5199:

```sh
npm run dev -- --host 127.0.0.1 --port 5199
OUT_DIR=scripts/out/fidelity-final REVIEW_DIR=docs/art-direction/fidelity node scripts/shot-fidelity.mjs
mkdir -p scripts/out/fidelity-playtest
OUT_DIR=scripts/out/fidelity-playtest node scripts/playtest.mjs
npm test
npm run build
```

The six JPEGs in `fidelity/` are retained for review. Full-resolution captures and `browser-errors.json` live in the ignored `scripts/out/fidelity-final/` directory.
