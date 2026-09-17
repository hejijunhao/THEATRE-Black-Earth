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

## Honest note vs Vic 3 / HOI4 (0.2.28 retip)

**What they do, and what we copied:**
- Terrain mode is soil and cover, not faction paint. Our default layer
  stays Terrain; this slice does not touch political washes.
- Fields are a cadastral patchwork. We already had strip frames; 0.2.27
  killed highlighter straw; this retip darkens the leftover mustard
  plate toward chernozem / loam and punches district chroma so rest
  zoom sees soil families, not one ochre field.
- Continuity under weather is the same dirt family. North lifts toward
  warm umber (not mustard khaki) so the far grid cannot collapse to
  cool grey. Fog / grade stay locked.

**What we did not copy:**
- A province terrain-type renderer or HOI4 terrain icons.
- Vic 3's political-map sat-colour (separate parked debt).
- Photoreal / satellite chernozem, or the inspector diorama plough
  (`#1c1713`). Editorial stance forbids real battlefield imagery; this
  is the existing painted canvas, retuned.

**Rejects held:** political recolour as the rest frame; fog / grade /
unit / HUD / reach retunes; inventing a second field grid; Vic plough.

**Honest craft verdict (pre-shot):** paint is darker and more split;
north keep is warmer umber. Live rest+rain + midzoom shots decide
whether the mustard plate and cool-grey lobe actually died. This is
still a painted albedo + strip displacement — **not** Vic cadastral
GIS and **not** the diorama field cap.
