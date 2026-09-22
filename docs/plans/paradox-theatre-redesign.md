# Paradox theatre redesign — September 2026

The play frame follows the user's authority stack: Vic 3 header and restrained
paper, HOI4 operational machines and battle density, cadastral Black Earth soil.
The existing Paradox reference library remains the chrome reference; its old
unlit-green stamp direction is superseded by this brief.

## Checkpoints

1. **Machines** (`49fbc4e`): shared matte diffuse material, muted faction paint,
   dimensional hull/turret/gun separation, invisible picking footprints,
   contact shadows and later counter LOD. Removed the global khaki colour key.
2. **Soil and board** (`b18e114`): fixed the canvas/world-UV orientation, removed
   constant-brightness terrain remapping, restored surveyed parcel values,
   reduced relief/clutter, resized infantry ranks, thinned contact and selection.
3. **HUD and paper** (`1e2d6e6`): 32px field header, on-demand collapsible formation
   list, compact selected-unit orders, odds and strength above verdict,
   plain confirm/dismiss controls. Corrected canvas font units and city labels.
4. **Integration and baselines**: fixed river face winding and bank sampling,
   tuned label/river scale, updated gameplay assertions and intentional goldens.

## Review

- `npm run dev -- --port 5199`
- `node scripts/shot-theatre.mjs`: native Chrome, full postprocessing, machines
  at rest/operational/campaign/close heights with `tbe-counters=0`; selection,
  list open/collapse, assault, dispatch, 1024×768 paper, clear/snow and counters.
- `node scripts/playtest.mjs`: map picking, movement, assault, operations, AI turn.
- `node scripts/golden.mjs`: five map modes and two close-up baselines.

Production build and 110 tests pass. The optional campaign-balance test is
skipped by default. Browser checks report no JavaScript/WebGL errors. Vite
retains its existing large-bundle warning; no runtime assets or dependencies
were added. The seven visual baselines are deliberately updated for this design.

[Terrain baseline](../../scripts/golden/baseline/mode-terrain.png)

The rules, designed scenario, save schema and generated geodata are unchanged.
