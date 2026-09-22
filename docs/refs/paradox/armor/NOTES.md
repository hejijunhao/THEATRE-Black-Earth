# Operational machines — revised authority

The September redesign supersedes the earlier unlit green stamp experiment.
HOI4 gameplay models supply the class silhouette and echelon density; Vic 3
supplies quiet material separation. The existing header/HOI4 captures are
context references, not evidence of exact model fidelity.

- Hull, raised turret, barrel, tracks and ranks remain actual geometry.
- Matte diffuse lighting reveals their planes. No screen-space roof remap,
  lime paint, plastic specular or procedural weathering overlay.
- UA is muted grey-green; RU is earth-grey. No solid faction plinth.
- Operational height retains machines; counters are Tab/remote-zoom LOD.
- Judge with `tbe-counters=0`, native rendering, and rain postprocessing.

Verification: `scripts/shot-theatre.mjs` captures rest, select, operational
and close views. Older `shot-armor.mjs` forces software GL and low quality;
its captures are not the visual acceptance authority for this redesign.
