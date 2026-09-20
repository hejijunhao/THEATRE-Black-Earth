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
  outliner/                 ← formation list / contact list
  map-modes/                ← political / supply / terrain overlays
  selection-orders/         ← select unit, move, attack, entrench
  board-chrome/             ← frontline / ZOC telegraph (HOI4 scar)
  reach-telegraph/          ← Vic 3 territory fill + Civ 6 movement blob
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

## Combat paper (seeded)

Target: thin left sheet, map still owns the frame. Ranked read is **odds → strength delta → one verdict line**. No die faces, no pip grid, no busy unit ledger. Steal Vic 3 *Battle for L'Aquila* (`combat-paper/vic3-battle-1.jpg`); reject EU5 Gandia ledger chrome. HOI4 land-battle window was not on the public Steam store CDN — steal its forecast / casualty language from the notes, do not invent a shot.

See [`combat-paper/NOTES.md`](combat-paper/NOTES.md).
