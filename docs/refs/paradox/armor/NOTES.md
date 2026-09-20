# Armor stamp — steal / reject

HOI4 **gameplay-zoom units**. Not Vic 3 (no tank class). Not Vic
political colour. Not Vic / inspector diorama soil. Live Paradox
screenshots are still TODO in this folder; the language below is from
HOI4's shipped 3D / counter read, not a reconstruction of their art.

## Steal (HOI4 units at gameplay zoom)
- A tank is a **silhouette stamp**: hull block, turret cap, gun finger
- Contrast is authored (dark hull / light top), not lit-wash weather
- Class reads at operational height without becoming a NATO plate

## Reject
- Shared hero weathering wash / pale plastic plate
- Vic 3 political sat-map colour on the hull
- Vic diorama soil or inspector-grade mud as the mid-zoom read
- INF / MECH / ARTY retouch (those stamps already CLEAR)
- Atmosphere, ground, HUD, reach, combat paper

## BLACK THEATRE target
Mid-zoom `armored` / `panzerHero` must read as an authored stamp —
unlit MeshBasic + vertex paint — with `tbe-counters` OFF. Geometry
from 0.2.17 stays; the wash leaves.

## Honest note vs HOI4 (0.2.29 tip)

**What they do, and what we copied:**
- At gameplay zoom a tank is a class-readable machine, not a token.
  We already had the Leopard-family hull; 0.2.29 takes it off the
  weathered MeshStandard wash and onto the INF-path Basic stamp that
  already CLEAR'd MECH / ARTY.
- Dark hull / light turret / dark gun is the read. Hull roof, glacis
  and engine deck stay dark so the turret owns the top-down stamp.

**What we did not copy:**
- HOI4's 3D unit models, division icons, or counter chrome.
- Vic 3 political colour or diorama plough.
- A new hero language or a screen-space roof remap (that flattened
  IFVs into one lime slab at boot).

**Rejects held:** wash keep-alive; counters-on judging; INF/MECH/ARTY
retouch; ground / rain / HUD / atmosphere.

**Honest craft verdict (live mid-zoom, counters OFF):** pending first
shot. Code-side the wash is gone and the vertex-paint split is
tested. Live rain + Grade still have to prove the stamp, not a pale
plate or a green blob. Not Vic diorama. Not HOI4 3D. A type-read
stamp.
