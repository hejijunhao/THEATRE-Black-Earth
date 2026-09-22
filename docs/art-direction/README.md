# BLACK THEATRE — earth and machines

21 September 2026 · Implemented presentation pass · Counters OFF

[Open the five-frame review](index.html). These are annotated captures of the running game, not speculative paintovers. Annotation numbers and captions belong to the review sheets only.

| Frame | Direction |
| --- | --- |
| [01 · Campaign / rest](frames/01-rest.jpg) | Keep the existing survey composition, city hierarchy and thin HUD. |
| [02 · Mid-zoom front](frames/02-front.jpg) | Machines and company ranks lead; soil, trees and banked water support them. |
| [03 · Parcel-close armor](frames/03-armor.jpg) | Dark running gear, lighter turret, distinct gun, fine earth and restrained stubble. |
| [04 · Infantry company](frames/04-infantry.jpg) | Four six-figure squads at full strength, tapered bodies, small rifles and command wagons. |
| [05 · River / town](frames/05-river-town.jpg) | Silt margins, dark water, low pitched roofs, settlement mass and thin crossings. |

## Steal / reject

**Victoria 3 terrain:** borrow the hierarchy of surveyed earth, cover and soft relief. Preserve the cadastral field layout; resolve clods and drill rows inside it as the camera descends. Keep umber, dark soil and muted olive related under rain. Reject enlarged repeating grain, satellite photography and a separate close-up diorama style.

**Hearts of Iron IV units:** borrow the immediate machine silhouette and small echelon formation. A hull, raised turret, track band and projecting gun identify armor; the IFV has a smaller autocannon; artillery has a tube, wheels and split trails. Faction paint stays restrained. Reject a primary NATO plate, luminous faction blobs, oversized soldiers and toy block proportions.

**Presentation:** retain existing header, outliner, city labels, camera composition and rules. Use restrained contact marks and a translucent range stain that respects machine depth. No new HUD system, faces, insignia or external image dependencies.

## Rebuild priority and implementation

1. **Materials first.** Reduce the baked furrow contrast that enlarged into wood grain. Add world-space soil grain, survey-aligned drill rows, small stubble highlights and derivative normal relief. Detail fades with camera distance and is suppressed in political/snow presentation. Rain darkens this material locally instead of adding a new soil hue. The DEM mesh receives more samples without changing its height model.
2. **Formation scale and paint next.** Retain the existing detailed armor, IFV, artillery and recon meshes; rebuilding their topology was unnecessary. Add restrained paint mottling and lower-hull dust. Rebuild infantry bodies and company composition; reduce dismount size consistently. Shape truck cab and canvas profiles. Halve the contact chevron and stop reach shading from covering vehicles. Subdivide the reach surface to follow relief and avoid stacking the near/far stain opacity.
3. **Close props.** Replace faceted tree balls with irregular, shaded broadleaf crowns. Replace plain urban cubes with masonry, eaves, pitched roofs, chimneys and windows. Group buildings into streets, move them away from formation anchors and push footprints away from river courses. Add narrow road surfaces and shoulders; thin bridge decks with curbs, anchored to the visible channel while retaining rules crossings. Build banks, shallows and channel as one draped river cross-section.
4. **LOD tuning last.** Preserve campaign field structure and unit/counter thresholds. Filter fine soil frequencies before they become subpixel noise; reduce grass height so the near layer stays operational in scale. Tune at the actual game camera before adding more mesh detail.

## Validation and limits

- Production build passes; Vite retains its large-bundle warning.
- 111 tests pass; the opt-in campaign balance test remains skipped.
- Browser playtest passes terrain picking, selection, movement, attack preview/resolution and a full AI turn; no page errors.
- Dedicated captures cover rest, front, armor, infantry, river/town, IFV, artillery, selection, clear and rain with counters explicitly off. Browser and shader errors are collected by the capture script.
- Existing golden comparison: five of seven images pass. Political mode differs by **1.95%** and close-up front by **1.50%** (rounded, just above the **1.5%** mean-error threshold). The shared unit and river rendering also appears in that mode. Baselines were left unchanged; these are outstanding visual-baseline differences, not a fully green golden run.
- These remain procedural operational miniatures. Settlement archetypes still repeat, and river depth is authored shading on a draped mesh rather than a carved hydrological bed. Low-end GPU performance has not been benchmarked; the denser terrain and crowns add geometry.

Reproduce locally, with the preview server on port 5199:

```sh
npm run dev -- --host 127.0.0.1 --port 5199
OUT_DIR=scripts/out/delivery node scripts/shot-presentation.mjs
node scripts/annotate-presentation.mjs
```

The raw captures, extra class/weather checks and browser-error log live in the ignored `scripts/out/delivery/` directory. The five review sheets and this handoff are retained in `docs/art-direction/`.
