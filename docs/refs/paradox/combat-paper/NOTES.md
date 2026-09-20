# Combat paper — steal / reject

Staff Estimate (commit) and After Action Report (dismiss) are one paper family.
Later HUD tip: **strip die faces; keep odds → strength delta → one verdict line.**

These notes are the steal sheet for that tip. Do not invent a fortune row, pip
grid, or “2d6” chrome while waiting for more shots.

## Shots in this folder

Official Steam store CDN (no login). Full 1920×1080 store screenshots, same
provenance as `header/`.

| File | Game | What it is | Use |
| --- | --- | --- | --- |
| `vic3-battle-1.jpg` | Victoria 3 | Live battle paper — *Battle for L'Aquila* (Abruzzo Front, 25 April 1881). Two named sides, Offense 39 vs Defense 31, start-of-battle headcount → current, Dead / Wounded / Demoralized, formation names. Map still owns the frame. **No die faces.** | **Steal.** Closest official shot to our estimate + AAR family. |
| `eu5-battle-1.jpg` | Europa Universalis V | Live battle sheet — *Battle of Gandia* (17 October 1607). Attacker / Defender columns, flags, a dense unit-row ledger. Thin left dock, but the sheet is a busy order-of-battle, not a three-line verdict. | **Reject as chrome.** Steal only the two-sided dock; do not copy the ledger. |

HOI4's land-battle window and the pre-attack combat-prediction tooltip are
**not** on the Hearts of Iron IV base-game or DLC store screenshot sets
(checked Steam Web API `appdetails` screenshots for app `394360` plus
Götterdämmerung, By Blood Alone, Arms Against Tyranny, La Résistance, Trial
of Allegiance, Battle for the Bosporus, Peace For Our Time). Paradox wiki
image hosts returned 427. Do not invent a HOI4 shot. Steal HOI4 from the
cited language below.

## Steal (Vic 3 primary)

Source: `vic3-battle-1.jpg` (Steam app `529340` store screenshot id 9) and
the Vic 3 wiki *Land warfare* battle-UI description
(<https://vic3.paradoxwikis.com/Land_warfare> — Overview vs Details tabs;
Offense vs Defense; generals; casualty / morale bill).

- **Thin left paper.** The map keeps the frame. The sheet is a dock, not a
  curtain or a full-screen ledger.
- **Same sheet family in and out.** Predicted exchange on the way in
  (Offense / Defense, start-of-battle counts); realized delta on the way out
  (Dead / Wounded / Demoralized, current vs start). One chrome language.
- **Odds as the middle comparison.** 39 Offense vs 31 Defense is the cousin
  of our ratio. Not a die face, not a pip grid.
- **Strength as a bill.** Start → current, plus a three-line loss delta.
  That is the only damage the player needs to read.
- **Two named sides, then stop.** Portraits / formation names are enough
  identity. No unit-by-unit roster on the estimate.
- **Overview is the steal; Details is the reject.** Wiki: Overview shows
  offense, defense, generals, and a short modifier list; Details dumps the
  granular modifier ledger. Our paper is Overview-thin.

## Steal (HOI4)

Source: HOI4 wiki *Land battle* (hourly resolution, attacker vs defender,
org / HP, manpower and equipment casualties, terrain and other modifiers as
a list; battle won when the opponent has no frontline divisions left) and
the well-known map **battle icon**: a 0–100 forecast toward holding or
breaking, coloured green / yellow / red for current trend — not a percentage
of divisions and not a die face
([Steam thread](https://steamcommunity.com/app/394360/discussions/0/357288572119004256/),
community consensus on the forecast number + colour).

- **Forecast / odds as the middle number.** Ratio or advantage between two
  names. Green / yellow / red trend is allowed; pip faces are not.
- **Strength as a bill.** HOI4's HP / manpower / equipment row is the cousin
  of our before → after StrengthStrip.
- **One-line outcome.** Held / retreated / shattered. That is the verdict.
- **Confirm or stand down.** Issue the attack or don't. The paper does not
  ask the player to watch dice.

Honest HOI4 reject, even on the steal side: the live land-battle window
*does* show hourly combat dice next to tactics and width. Steal the
prediction and the casualty bill; **do not steal those dice** to replace
the ones we are stripping. We also do not have a live 0–100 progress bar or
hourly org ticks — this remains a single-resolution PC2 exchange. Do not
fake a HOI4 progress pip.

## Reject (EU5 / EU4)

Source: `eu5-battle-1.jpg` (Steam app `3450310` store screenshot id 4) and
the EU5 wiki *Combat*
(<https://eu5.paradoxwikis.com/Combat>): each 5-hour phase both sides roll
a 6-sided die; `dice_impact` drives strength and morale damage; terrain and
river crossings apply as dice penalties; the sheet tracks center / left /
right / reserve.

- **Pip-dice theater.** Die faces, roll totals, fortune strips. That is the
  pattern Phil named as not useful. The simulation may still swing; the
  paper does not illustrate the swing as dice.
- **Busy unit ledger.** Gandia is a two-sided dock full of regiment rows.
  Reject that density for Staff Estimate / AAR. PC2 paper is three ranked
  lines, not an order-of-battle.
- **Do not re-home 2d6** as a second row of totals, ×fortune badges, or
  “before dice” / “the roll” copy.

## BLACK THEATRE target

Staff estimate and after-action stay one CombatPaper family (wash, not
curtain). Ranked read, in this order:

1. **One-line verdict** — estimate: staff advantage / even / disadvantage;
   AAR: held / fell back / destroyed.
2. **Odds in the middle** — ratio or advantage label. No die face.
3. **Strength before → after** — and the −delta when something was lost.
4. **One confirm + one dismiss** on the estimate (Commit / Withdraw);
   one dismiss on the AAR (Continue).

Drop: die-face glyphs, pip grids, “2d6” as chrome, “before dice” / “the
roll” as confirm language, any AAR fortune row.

## Sources

- Victoria 3 store screenshots via Steam Web API `appdetails` app `529340`
  (shot id 9 → `vic3-battle-1.jpg`).
- Europa Universalis V store screenshots via the same API, app `3450310`
  (shot id 4 → `eu5-battle-1.jpg`).
- [Vic 3 wiki — Land warfare](https://vic3.paradoxwikis.com/Land_warfare)
  (battle Overview / Details; Offense vs Defense; casualties and morale).
- [HOI4 wiki — Land battle](https://hoi4.paradoxwikis.com/Land_battle)
  (hourly land combat; org / HP; casualty bill; retreat / shatter).
- [HOI4 Steam discussion — battle-icon number](https://steamcommunity.com/app/394360/discussions/0/357288572119004256/)
  (0–100 forecast + green / yellow / red trend).
- [EU5 wiki — Combat](https://eu5.paradoxwikis.com/Combat)
  (6-sided phase dice; `dice_impact`; frontage / flanks).
- HOI4 store + DLC `appdetails` screenshot lists: no land-battle window or
  combat-prediction tooltip in the public CDN set (see Shots).
