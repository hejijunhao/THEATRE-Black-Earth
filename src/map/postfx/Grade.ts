// Per-weather colour grade (v2-vision §4.5): a custom postprocessing Effect
// instead of LUT files — the repo ships no assets. Each weather is a small
// set of grading parameters ("a different film stock"), lerped smoothly so
// weather changes feel like light shifting, not a palette swap.

import { Effect } from 'postprocessing';
import { Uniform } from 'three';
import { WeatherType } from '../../game/types';

const FRAG = /* glsl */ `
  uniform float uTemp;      // warm(+) / cold(-)
  uniform float uTintG;     // green(+) / magenta(-)
  uniform float uSat;
  uniform float uContrast;
  uniform float uLift;      // lifted blacks (humid haze)

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 c = inputColor.rgb;
    c *= 1.12; // gain: reclaim what the composer chain takes
    c.r *= 1.0 + uTemp * 0.085;
    c.b *= 1.0 - uTemp * 0.085;
    c.g *= 1.0 + uTintG * 0.05;
    c += uLift * (1.0 - c);
    c = (c - 0.5) * uContrast + 0.5;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
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
}

// The film stocks.
export const WEATHER_GRADE: Record<WeatherType, GradeParams> = {
  clear:    { temp: 0.42,  tintG: 0.06,  sat: 1.18, contrast: 1.14, lift: 0.0 },
  overcast: { temp: 0.04,  tintG: 0.02,  sat: 1.02, contrast: 1.06, lift: 0.008 },
  rain:     { temp: -0.08, tintG: 0.0,   sat: 0.94, contrast: 1.04, lift: 0.014 },
  mud:      { temp: 0.22,  tintG: 0.1,   sat: 0.96, contrast: 1.05, lift: 0.008 },
  snow:     { temp: -0.22, tintG: -0.02, sat: 0.9,  contrast: 1.08, lift: 0.02 },
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
  }
}
