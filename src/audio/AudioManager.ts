import { Howler } from 'howler';

/**
 * All sound goes through Howler's global context, so Howler.mute() and its mobile auto-unlock
 * cover everything. Until real recordings exist, every sound is synthesised here (placeholders).
 */
export type Ambience = 'room' | 'tv' | 'office' | 'kitchen' | 'hall' | 'none';

interface AmbienceLayer {
  stop: (fadeSeconds: number) => void;
}

const AMBIENCE: Record<Exclude<Ambience, 'none'>, { noise: number; lowpass: number; hum?: number; murmur?: boolean }> = {
  room: { noise: 0.05, lowpass: 380 },
  tv: { noise: 0.04, lowpass: 420, hum: 0.03 },
  office: { noise: 0.05, lowpass: 600 },
  kitchen: { noise: 0.06, lowpass: 900 },
  hall: { noise: 0.07, lowpass: 700, murmur: true },
};

class AudioManagerImpl {
  private current: AmbienceLayer | null = null;
  private currentName: Ambience = 'none';
  private noiseBuffer: AudioBuffer | null = null;

  private get ctx(): AudioContext {
    Howler.volume(); // creates Howler.ctx and Howler.masterGain on first use
    return Howler.ctx;
  }

  private get out(): GainNode {
    Howler.volume();
    return Howler.masterGain;
  }

  /** Must run inside a user gesture (the "enter" tap). */
  async unlock() {
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  setMuted(muted: boolean) {
    Howler.mute(muted);
  }

  private noise(): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const length = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    return buffer;
  }

  setAmbience(name: Ambience) {
    if (name === this.currentName) return;
    this.current?.stop(1.2);
    this.current = null;
    this.currentName = name;
    if (name === 'none') return;

    const ctx = this.ctx;
    const spec = AMBIENCE[name];
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, ctx.currentTime);
    bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
    bus.connect(this.out);

    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = spec.lowpass;
    const level = ctx.createGain();
    level.gain.value = spec.noise;
    src.connect(filter).connect(level).connect(bus);
    src.start();
    const nodes: AudioScheduledSourceNode[] = [src];

    if (spec.hum) {
      for (const freq of [50, 100]) {
        const osc = ctx.createOscillator();
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = spec.hum / (freq / 50);
        osc.connect(g).connect(bus);
        osc.start();
        nodes.push(osc);
      }
    }

    if (spec.murmur) {
      // Slow swell on a band of noise: a crowd waiting in a hall.
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 450;
      band.Q.value = 0.8;
      const swell = ctx.createGain();
      swell.gain.value = 0.05;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 0.03;
      lfo.connect(lfoDepth).connect(swell.gain);
      const crowd = ctx.createBufferSource();
      crowd.buffer = this.noise();
      crowd.loop = true;
      crowd.connect(band).connect(swell).connect(bus);
      crowd.start();
      lfo.start();
      nodes.push(crowd, lfo);
    }

    this.current = {
      stop: (fade) => {
        const t = ctx.currentTime;
        bus.gain.cancelScheduledValues(t);
        bus.gain.setValueAtTime(bus.gain.value, t);
        bus.gain.linearRampToValueAtTime(0, t + fade);
        nodes.forEach((n) => n.stop(t + fade + 0.05));
        setTimeout(() => bus.disconnect(), (fade + 0.2) * 1000);
      },
    };
  }

  /** TV static crackle between channels. */
  static(duration = 0.5) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.linearRampToValueAtTime(0.08, t + duration * 0.8);
    g.gain.linearRampToValueAtTime(0, t + duration);
    src.connect(filter).connect(g).connect(this.out);
    src.start(t, Math.random());
    src.stop(t + duration + 0.05);
  }

  /** Short mechanical click: remote buttons, tape insert, UI taps. */
  click(kind: 'soft' | 'tape' = 'soft') {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const hits = kind === 'tape' ? [0, 0.09, 0.22] : [0];
    for (const offset of hits) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(kind === 'tape' ? 180 : 900, t + offset);
      osc.frequency.exponentialRampToValueAtTime(60, t + offset + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(kind === 'tape' ? 0.12 : 0.05, t + offset);
      g.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.06);
      osc.connect(g).connect(this.out);
      osc.start(t + offset);
      osc.stop(t + offset + 0.07);
    }
  }
}

export const audio = new AudioManagerImpl();
