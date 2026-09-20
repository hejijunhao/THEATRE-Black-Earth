# Outliner — steal / reject

## Steal (Vic 3 primary)
- Outliner is **collapsible**. At peace / rest it is a tab, not a second map.
- Map owns the frame until you pin the list or select something that needs it.
- Open list is a dense roster (type + strength), not a second briefing.

## Steal (HOI4)
- Army / theatre list can sit collapsed as an icon while you stare at the board.
- Expanding it does not invent a new panel family — same chrome, just visible.

## Reject
- A permanent full-height OOB column at rest (our 0.2.13 week-runner as a standing wall).
- EU5-style stacked peacetime side decks that compete with the province.

## BLACK THEATRE target
Rest frame: Next-unspent is a **chip** (kicker + type glyph + remaining count + open chevron). The sector list mounts on select, on that chevron, or as the existing thin rail through combat paper.

## Honest note vs Vic 3 / HOI4 (0.2.26)

Live Paradox screenshots are still TODO in this folder. The language below is from Vic 3's shipped outliner and HOI4's army list at peace — not a reconstruction of their art.

**What they do, and what we copied:**
- Collapse at rest so the map is the hero. Vic 3's outliner folds to a side tab; HOI4's army pane can sit as an icon. Ours is a Next chip under the header, ~one instrument row tall.
- Expand when needed. Selecting a formation (map click, `N`, Next) opens the sector week-runner. A chevron opens the same list without selecting.
- Same instrument once open: type glyph, name, strength, agency. Not a new dossier.

**What we did not copy:**
- Vic 3's multi-category outliner (buildings, politics, military as stacked folders). We have one week-runner — formations by front.
- HOI4's theatre / army-group tree and the right-edge peacetime icon stack. Ours stays top-left, one chip.
- A persistent pin that survives every deselect unless you asked. Select opens because play needs the roster; deselect returns to the chip unless the chevron pinned it.

**Rejects held:** a standing 176px rail at rest; putting OOB chrome on the header (header tip is locked); Astra / full UI redo.
