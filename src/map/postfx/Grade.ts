// Per-weather colour grade (v2-vision §4.5): a custom postprocessing Effect
// instead of LUT files — the repo ships no assets. Each weather is a small
// set of grading parameters ("a different film stock"), lerped smoothly so
// weather changes feel like light shifting, not a palette swap.
//
// Rain also carries a veil-break: after N8AO + vignette, dark-and-grey
// pixels (the charcoal hole) are lifted toward mid khaki. Saturated
// strip-fields sit above the luma/sat gates and are left alone.

import { Effect } from 'postprocessing';
import { Uniform } from 'three';
import { WeatherType } from '../../game/types';

const FRAG = /* glsl */ `
  uniform float uTemp;      // warm(+) / cold(-)
  uniform float uTintG;     // green(+) / magenta(-)
  uniform float uSat;
  uniform float uContrast;
  uniform float uLift;      // lifted blacks (humid haze)
  uniform float uVeil;      // charcoal-veil break, 0..1

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 c = inputColor.rgb;
    c *= 1.12; // gain: reclaim what the composer chain takes
    c.r *= 1.0 + uTemp * 0.085;
    c.b *= 1.0 - uTemp * 0.085;
    c.g *= 1.0 + uTintG * 0.05;

    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float sat = length(c - vec3(l));
    // Veil signature: dark AND grey. Midground khaki has sat and luma.
    float veil = (1.0 - smoothstep(0.11, 0.36, l)) * (1.0 - smoothstep(0.016, 0.085, sat));
    veil *= uVeil;
    vec3 khaki = vec3(0.58, 0.50, 0.32);
    c = mix(c, max(c, khaki), veil * 0.88);
    // Power-curve lift: valleys after AO, not a global wash.
    c += uLift * pow(1.0 - clamp(l, 0.0, 1.0), 1.55);

    c = (c - 0.5) * uContrast + 0.5;
    l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, uSat);
    outputColor = vec4(clamp(c, 0.0, 1.0), inputColor.a);
  }
`;

export interface GradeParams {
  temp: number;
  tintG: number;
  sat: number;
  contrast: number;
  lift: number;
  veil: number;
}

// The film stocks.
export const WEATHER_GRADE: Record<WeatherType, GradeParams> = {
  clear:    { temp: 0.38,  tintG: 0.05,  sat: 1.14, contrast: 1.1,  lift: 0.008, veil: 0.12 },
  overcast: { temp: 0.16,  tintG: 0.05,  sat: 1.02, contrast: 1.03, lift: 0.018, veil: 0.28 },
  rain:     { temp: 0.22,  tintG: 0.06,  sat: 1.02, contrast: 1.0,  lift: 0.046, veil: 1.0 },
  mud:      { temp: 0.22,  tintG: 0.08,  sat: 1.0,  contrast: 1.01, lift: 0.032, veil: 0.7 },
  snow:     { temp: -0.12, tintG: 0.0,   sat: 0.92, contrast: 1.05, lift: 0.022, veil: 0.15 },
};

export class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', FRAG, {
      uniforms: new Map<string, Uniform>([
        ['uTemp', new Uniform(0)],
        ['uTintG', new Uniform(0)],
        ['uSat', new Uniform(1)],
        ['uContrast', new Uniform(1)],
        ['uLift', new Uniform(0)],
        ['uVeil', new Uniform(0)],
      ]),
    });
  }

  lerpTowards(p: GradeParams, k: number): void {
    const u = this.uniforms;
    const step = (name: string, target: number) => {
      const uni = u.get(name)!;
      uni.value += (target - uni.value) * k;
    };
    step('uTemp', p.temp);
    step('uTintG', p.tintG);
    step('uSat', p.sat);
    step('uContrast', p.contrast);
    step('uLift', p.lift);
    step('uVeil', p.veil);
  }
}
