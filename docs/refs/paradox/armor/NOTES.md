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

**Honest craft verdict (live mid-zoom, counters OFF):**

Stamp authority vs pale wash: **PASS**. Close frame of 17th Tank
(`tbe-counters=0`; this host is SwiftShader and PostFX is off because
the composer blit-breaks) reads as a dark-green hull, light
field-green turret, dark gun finger, four-tank echelon. Not a khaki
plastic plate and not a NATO counter. Turret-like texels sit on the
stamp green (`≈20,90,23`).

Vs HOI4 gameplay-zoom 3D: **FAIL, parked**. No GPU here. SwiftShader
draws the hero mesh as a blocky stamp, not HOI4 unit density. The
paint split is the steal; the mesh fidelity is not.

Vs Vic diorama / political colour: **FAIL, parked**. Ground is locked;
the ochre slab in these shots is the terrain shader dying on software
GL, not an armor retune.

Live HOI4 reference shots still TODO (Steam/CDN). Do not invent them.
