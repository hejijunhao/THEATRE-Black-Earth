# Paradox reference library

Phil’s standing craft rule: **for every BLACK THEATRE feature / panel / interaction, find the Paradox equivalent (HOI4 / Vic 3 / EU5), screenshot it, store it here, then replicate in our own style** (Vic 3 language preferred; PC2-simple depth).

Do **not** invent UI from scratch when a Paradox pattern already solved the same job.

## Layout

```
docs/refs/paradox/
  README.md                 ← this file
  FEATURE-MAP.md            ← feature → Paradox equivalent → ref shots → our target
  header/                   ← top bar / resource chips / date-speed
  combat-paper/             ← estimate / AAR / engagement (no die glyphs)
  combat-stamps/            ← ASSAULT / DISPATCH / FIRES strip (not rubber badge)
  outliner/                 ← formation list / contact list
  map-modes/                ← political / supply / terrain overlays
  selection-orders/         ← select unit, move, attack, entrench
  board-chrome/             ← frontline / ZOC telegraph (HOI4 scar)
  reach-telegraph/          ← Vic 3 territory fill + Civ 6 movement blob
  ground/                   ← Vic 3 / HOI4 terrain albedo (not political)
  armor/                    ← HOI4 mid-zoom tank stamp (not Vic diorama)
  (add a folder per feature as we go)
```

## Rules

1. One folder per **named feature** (matches our one-slice-per-tip craft).
2. Prefer **Vic 3** chrome language; use HOI4 for operational/military density; EU5 only when it shows a clearer chip/thin-strip pattern (avoid EU5 portrait clutter).
3. Each folder: 2–4 reference JPGs + a short `NOTES.md` (what to steal / what to reject).
4. Update `FEATURE-MAP.md` when adding a feature.
5. These are **reference art**, not shippable assets. Keep under `docs/refs/` so they never hit the runtime bundle.

## Header (tipped)

Target: thin strip, flag left, icon+number resource chips, week/weather chip, settings right — **no THEATRE wordmark banner** on the play HUD. 0.2.25 ships that language. Live Vic 3 shots still TODO; notes record the honest delta.

## Outliner (tipped)

Target: Vic 3 / HOI4 peacetime collapse — **map-primary at rest**. Next-unspent is a chip; the sector week-runner mounts on select or explicit open. Combat paper keeps the thin rail. Live Paradox screenshots still TODO; notes record the honest delta.

## Ground albedo (retipped)

Target: Vic 3 / HOI4 **terrain** soil — cadastral quiet earth, not
political-map colour and not a mustard ochre plate. Strip/parcel language
from 0.2.18 stays. 0.2.28 darkens midground and warms the far-north keep.
Live Paradox shots still TODO; notes record the honest delta.

## Armor stamp (seeded, notes)

Target: HOI4 gameplay-zoom unit authority — an authored tank silhouette
(dark hull / light turret / gun), not a weathered plastic wash and not
a NATO plate. Vic 3 has no tank class; do not steal Vic diorama soil or
political colour. Live HOI4 shots still TODO; notes record the honest
delta.

## Combat paper (seeded, notes)

Target: HOI4 land-battle / Vic 3 battle language — **odds, strength before→after, one-line verdict**. No die-face glyphs. Confirm / dismiss only. EU pip-dice theater is the reject. Live Paradox screenshots still TODO; do not invent a fortune row to replace the faces.

## Combat stamps (seeded, notes)

Target: Vic 3 thin-strip + HOI4 window-type — **ASSAULT / DISPATCH / FIRES as a hairline classification rail**, kicker left, mark right. No rotated rubber badge, no ledger chips on the strip. Live Paradox screenshots still TODO; do not invent a seal to replace the box we removed.
