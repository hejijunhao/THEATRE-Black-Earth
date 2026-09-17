// Rain post-stack. The north veil that survived albedo/fog lifts is this
// chain: N8AO darkens valleys and forest stems, then vignette crushes the
// top of the boot frame (the far north). Grade runs LAST so the veil-break
// can undo what AO still leaves. Presentation constants only.

export const RAIN_AO = {
  intensity: 0.22,
  aoRadius: 0.72,
  distanceFalloff: 1.6,
  color: '#8c8058',
} as const;

export const FAIR_AO = {
  intensity: 0.42,
  aoRadius: 1.05,
  distanceFalloff: 1.35,
  color: '#6e6248',
} as const;

export const RAIN_VIGNETTE = { offset: 0.84, darkness: 0.008 } as const;
export const FAIR_VIGNETTE = { offset: 0.62, darkness: 0.028 } as const;

export function isWetWeather(weather: string): boolean {
  return weather === 'rain' || weather === 'mud';
}
