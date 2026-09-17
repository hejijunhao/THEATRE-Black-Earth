// Cultivated-steppe strip fields. Shared by the albedo painter (parcel
// colour + dirt) and the heightfield (contact-scale relief) so the two
// cannot drift. Deterministic integer hash — no Math.random().

export interface RGB { r: number; g: number; b: number }

export function rgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

export function ihash(x: number, y: number, salt: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(salt | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnoise(x: number, y: number, salt: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = x - xi;
  const ty = y - yi;
  const sm = (t: number) => t * t * (3 - 2 * t);
  return (
    ihash(xi, yi, salt) * (1 - sm(tx)) * (1 - sm(ty)) +
    ihash(xi + 1, yi, salt) * sm(tx) * (1 - sm(ty)) +
    ihash(xi, yi + 1, salt) * sm(tx) * sm(ty) +
    ihash(xi + 1, yi + 1, salt) * sm(tx) * sm(ty)
  );
}

export function noise2(x: number, y: number, salt: number): number {
  return vnoise(x, y, salt) * 0.65 + vnoise(x * 2.7, y * 2.7, salt + 1) * 0.35;
}

// Cadastral soil, not printed khaki. Value-split so rest still reads
// parcel edges; chroma is chernozem / loess / muted stubble / pasture —
// the diorama field and steppe caps lifted for campaign zoom, not
// highlighter straw. Lightest parcel must stay under a beige-flood gate.
const FIELD_COLORS = [
  '#c4ae78', // dry stubble
  '#8a6e44', // cereal brown
  '#5c4430', // chernozem
  '#a09060', // loess fallow
  '#4e3a26', // wet plough
  '#6e7048', // pasture olive
].map(rgb);
const SHELTER = rgb('#3a2e18');
const DIRT = rgb('#5a3e20');
const FURROW = rgb('#3e2a16');

export interface StripFrame {
  u: number;
  v: number;
  stripW: number;
  parcelL: number;
  strip: number;
  parcel: number;
  theta: number;
  /** 0 at a strip centre, 0.5 at a strip boundary. */
  edgeU: number;
  /** 0 at a parcel centre, 0.5 at a parcel-end. */
  edgeV: number;
}

/** Regional strip orientation + parcel ids. Stable for a whole campaign. */
export function stripFrame(wx: number, wz: number): StripFrame {
  const rx = Math.floor(wx / 14);
  const rz = Math.floor(wz / 14);
  const theta = ihash(rx, rz, 101) * Math.PI;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const u = wx * cos + wz * sin;
  const v = -wx * sin + wz * cos;
  const stripW = 0.28 + ihash(rx, rz, 103) * 0.26;
  const parcelL = stripW * (5 + ihash(rx * 517 + Math.floor(u / stripW), rz, 107) * 5);
  const strip = Math.floor(u / stripW);
  const parcel = Math.floor(v / parcelL);
  const edgeU = Math.abs(u / stripW - Math.round(u / stripW));
  const edgeV = Math.abs(v / parcelL - Math.round(v / parcelL));
  return { u, v, stripW, parcelL, strip, parcel, theta, edgeU, edgeV };
}

/**
 * Midground strip-field colour. Parcel edges, shelter belts and furrow
 * dirt are the contact-scale read — surveyed soil, not a second khaki wash.
 */
export function fieldColor(wx: number, wz: number): RGB {
  const f = stripFrame(wx, wz);
  const rx = Math.floor(wx / 14);
  const rz = Math.floor(wz / 14);
  const pick = Math.floor(ihash(rx * 517 + f.strip, rz * 763 + f.parcel, 109) * FIELD_COLORS.length);
  let c = FIELD_COLORS[pick];

  // Furrow / drill rows: high-frequency dirt inside the parcel.
  const furrow = 0.5 + 0.5 * Math.sin((f.u / f.stripW) * Math.PI * 2 * (3 + ihash(rx, rz, 111) * 3));
  if (furrow > 0.62) c = mix(c, FURROW, 0.42 * (furrow - 0.62) / 0.38);

  // Shelter-belt / headland darkening on both axes.
  if (f.edgeU < 0.12) c = mix(c, SHELTER, 0.58 * (1 - f.edgeU / 0.12));
  if (f.edgeV < 0.10) c = mix(c, DIRT, 0.46 * (1 - f.edgeV / 0.10));

  // Soft clod + finer crumb so a parcel is dirt, not a printed swatch.
  const clod = (noise2(wx * 3.4, wz * 3.4, 73) - 0.5) * 0.18;
  const crumb = (noise2(wx * 7.2, wz * 7.2, 79) - 0.5) * 0.07;
  const n = clod + crumb;
  c = { r: c.r * (1 + n), g: c.g * (1 + n * 0.82), b: c.b * (1 + n * 0.55) };
  return c;
}

/**
 * Contact-scale relief in world Y. Terrace between strips, a lip at the
 * parcel end, and a shallow furrow wave. Amplitude stays well below hex
 * height so units still sit and the north veil cannot return.
 */
export function parcelRelief(wx: number, wz: number): number {
  const f = stripFrame(wx, wz);
  const rx = Math.floor(wx / 14);
  const rz = Math.floor(wz / 14);
  const terrace = (ihash(rx * 517 + f.strip, rz, 113) - 0.5) * 0.048;
  const lip = Math.max(0, 0.08 - f.edgeU) * 0.32 + Math.max(0, 0.07 - f.edgeV) * 0.22;
  const wave = Math.sin((f.u / f.stripW) * Math.PI * 2) * 0.012;
  return terrace + lip + wave;
}

/** Neighbour-parcel luma gap used by the strip-volume unit gate. */
export function fieldLumaDelta(wx: number, wz: number, du = 0.18, dv = 0): number {
  const a = fieldColor(wx, wz);
  const b = fieldColor(wx + du, wz + dv);
  const la = 0.2126 * a.r + 0.7152 * a.g + 0.0722 * a.b;
  const lb = 0.2126 * b.r + 0.7152 * b.g + 0.0722 * b.b;
  return Math.abs(la - lb);
}
