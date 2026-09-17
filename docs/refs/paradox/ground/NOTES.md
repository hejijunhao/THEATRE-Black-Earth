# Ground albedo — steal / reject

Vic 3 / HOI4 **terrain** albedo. Not the political map. Live Paradox
screenshots are still TODO in this folder; the language below is from the
shipped terrain modes, not a reconstruction of their art.

## Steal (Vic 3 terrain, not political)
- Cadastral quiet soil: ploughed earth, stubble, fallow, a little pasture
- Value-split fields that read as surveyed parcels, not one printed swatch
- Earth chroma — umber, chernozem, muted olive — not country fills

## Steal (HOI4 terrain)
- Farmland / plains as brown-olive dirt at gameplay zoom
- Forests stay a separate olive, not a khaki wash
- Weather darkens the same soil; it does not recolour the theatre

## Reject
- Vic / HOI **political** flat colour (parked debt, out of scope)
- EU5 / Vic political sat-maps as the rest frame
- Another khaki keep-alive that paints the scar beige
- Armor stamp, HUD, atmosphere retunes (other tips)

## BLACK THEATRE target
Rest + rain must read as authored ground — diorama soil at campaign
zoom — without destroying the strip/parcel language from 0.2.18.

## Honest note vs Vic 3 / HOI4 (0.2.27)

**What they do, and what we copied:**
- Terrain mode is soil and cover, not faction paint. Our default layer
  stays Terrain; this slice does not touch political washes.
- Fields are a cadastral patchwork. We already had strip frames; the
  retune is the *paint* — chernozem / loess / muted stubble / pasture
  instead of highlighter straw (`#f0d488` / `#e2c070`).
- Continuity under weather is the same dirt family. North still lifts
  toward loess so the far grid cannot collapse to cool grey.

**What we did not copy:**
- A province terrain-type renderer or HOI4 terrain icons.
- Vic 3's political-map sat-colour (separate parked debt).
- Photoreal / satellite chernozem. Editorial stance forbids real
  battlefield imagery; this is the existing painted canvas, retuned.

**Rejects held:** political recolour as the rest frame; fog / grade /
unit / HUD / reach retunes; inventing a second field grid.

**Honest craft verdict:** this is still a painted albedo + strip
displacement, not Vic cadastral GIS or a HOI4 terrain mesh. The pass is
whether rest-under-rain reads as surveyed soil instead of a quiet khaki
slab. See the PR for PASS/FAIL against the diorama field/steppe caps.
