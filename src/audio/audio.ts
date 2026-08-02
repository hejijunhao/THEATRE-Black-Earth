// Procedural audio: wind ambience, a low drone bed, and short interface /
// combat cues — all synthesized with WebAudio, no asset files. The engine
// starts on the first user gesture (browser autoplay policy).

import { AudioSettings } from '../game/state/store';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private started = false;
  private settings: AudioSettings = { master: 0.7, music: 0.5, sfx: 0.7, muted: false };

  start(): void {
    if (this.started) return;
    try {
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this.musicBus = ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus = ctx.createGain();
      this.sfxBus.connect(this.master);
      this.applySettings(this.settings);
      this.startWind(ctx, this.musicBus);
      this.startDrone(ctx, this.musicBus);
      this.started = true;
    } catch {
      // Audio unavailable; run silently.
    }
  }

  applySettings(s: AudioSettings): void {
    this.settings = s;
    if (!this.master || !this.musicBus || !this.sfxBus || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : s.master * 0.8, t, 0.1);
    this.musicBus.gain.setTargetAtTime(s.music, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(s.sfx, t, 0.1);
  }

  // Continuous filtered-noise wind.
  private startWind(ctx: AudioContext, out: GainNode): void {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.015 * white) / 1.015; // brown-ish noise
      data[i] = last * 4;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = ctx.createGain();
    gain.gain.value = 0.16;
    // Slow amplitude undulation.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start();
    lfo.start();
  }

  // Two very quiet detuned drones — tension, not melody.
  private startDrone(ctx: AudioContext, out: GainNode): void {
    const gain = ctx.createGain();
    gain.gain.value = 0.028;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    for (const freq of [55, 82.5, 110.3]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 8;
      osc.connect(filter);
      osc.start();
    }
    filter.connect(gain);
    gain.connect(out);
  }

  private blip(freq: number, dur: number, gainV: number, type: OscillatorType = 'sine'): void {
    if (!this.ctx || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gainV, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private thump(dur: number, gainV: number, freqStart = 120, freqEnd = 38): void {
    if (!this.ctx || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur * 0.7);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainV, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    // Noise burst layered on top
    const noiseDur = Math.min(0.25, dur);
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * noiseDur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const nf = this.ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 900;
    const ng = this.ctx.createGain();
    ng.gain.value = gainV * 0.6;
    src.connect(nf);
    nf.connect(ng);
    ng.connect(this.sfxBus);
    src.start(t);
  }

  click(): void { this.blip(1400, 0.06, 0.05, 'square'); }
  select(): void { this.blip(880, 0.09, 0.06); }
  move(): void { this.blip(440, 0.12, 0.05, 'triangle'); }
  combat(): void { this.thump(0.8, 0.4); }
  bombard(): void { this.thump(0.6, 0.3, 90, 30); }
  capture(): void { this.blip(523, 0.16, 0.08); setTimeout(() => this.blip(659, 0.2, 0.08), 110); }
  turn(): void { this.thump(1.1, 0.16, 70, 30); setTimeout(() => this.blip(330, 0.3, 0.05, 'triangle'), 180); }
  alert(): void { this.blip(620, 0.14, 0.07, 'square'); }
}

export const audio = new AudioEngine();
