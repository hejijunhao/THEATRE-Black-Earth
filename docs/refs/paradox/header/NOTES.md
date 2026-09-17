# Header — steal / reject

## Steal (Vic 3 primary)
- Thin continuous top strip; map still owns the frame
- Flag (or faction mark) left — not a product wordmark
- Resources as **icon + number** chips (color delta ok)
- Date / week as one chip; speed/settings right

## Steal (HOI4)
- Dense but legible icon row for operational resources
- No long labels on the strip

## Reject (EU5 caution)
- Ruler portrait crowding the top-left
- Busy multi-row header that eats map

## BLACK THEATRE target
Kill `THEATRE · BLACK EARTH` wordmark on play HUD. Faction + week + icon chips only.

## Honest note vs Vic 3 (0.2.25)

Live Paradox screenshots are still TODO in this folder. The language below is from Vic 3's shipped play header, not a reconstruction of their art.

**What Vic 3 does, and what we copied:**
- One ~30px strip. We are 32px (`--play-header-h`). The map starts immediately under it.
- Country identity left (their flag / our two-band `UA`/`RU` mark + code). Not a studio or product wordmark.
- Stocks as icon + tabular number. Ours: manpower, equipment, command. No "Manpower" labels on the strip; the depot flyout still names them when asked.
- Date/weather as **one** chip. Ours: weather glyph + `W{n}` + weather word. Month sits in the tooltip, not as a second cell.
- Utility cluster right (their settings / speed; our End + settings + menu). Staff verbs (journal, dossier, ops, reserves) are icon-only so they do not become a labeled toolbar.

**What we did not copy:**
- Vic 3's long resource row (prestige, gold, influence, …). We have three operational stocks.
- Speed buttons. Our clock is week-stepped; End is the advance.
- National flag art. Editorial stance forbids photoreal heraldry; the mark is two abstract bands in the existing faction colours.
- The old `HOLDING` display-type pulse. Decisive-city beads stay on the faction chip so the clock is still one click.

**Rejects held:** EU5 portrait clutter; a second header row; putting THEATRE back as a banner.
