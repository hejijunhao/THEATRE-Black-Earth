// Minimal typings for n8ao (ships untyped).
declare module 'n8ao' {
  import { Camera, Color, Scene } from 'three';
  import { Pass } from 'postprocessing';

  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    configuration: {
      aoRadius: number;
      distanceFalloff: number;
      intensity: number;
      halfRes: boolean;
      color: Color;
      aoSamples?: number;
      denoiseSamples?: number;
      denoiseRadius?: number;
    };
    setSize(width: number, height: number): void;
  }
}
