import { randomWalk } from '../../utils.js';

/** @typedef {import('../../types.js').Point3} Point3 */

const LAUGH = Object.freeze({ syllables: 5, spacing: 0.17, length: 0.13, pitch: 300, pitchDrop: 0.07, vowel: 800 });
const SCREAM = Object.freeze({ duration: 1.5, release: 0.5, volume: 0.7 });
/** @type {readonly { frequency: number, waveform: OscillatorType }[]} */
const SCREAM_VOICES = Object.freeze([
  { frequency: 620, waveform: 'sawtooth' },
  { frequency: 930, waveform: 'square' },
  { frequency: 1240, waveform: 'sawtooth' },
  { frequency: 455, waveform: 'triangle' },
]);
const CREAK_PITCH_WALK = Object.freeze({ steps: 16, min: 50, max: 220, maxStep: 40, upwardBias: 0.1 });

/** Every one-off sound effect, synthesized from AudioEngine voices. Every `position` is a Point3. */
export class SoundLibrary {
  #engine;
  #screamSample = null;

  constructor(engine) {
    this.#engine = engine;
  }

  /** Uses a recorded scream instead of the synthesized one, if one of `paths` exists. */
  async loadScreamSample(paths) {
    this.#screamSample = await this.#engine.loadFirstAvailableSample(paths);
  }

  footstep(sprinting) {
    const volume = sprinting ? 0.3 : 0.2;
    this.#engine.playNoise({ duration: 0.08, volume, filter: { type: 'lowpass', frequency: 600 + Math.random() * 300, resonance: 0.7 } });
    this.#engine.playTone({ frequency: 90 + Math.random() * 20, endFrequency: 50, duration: 0.07, volume: volume * 0.6 });
  }

  switchClick() {
    this.#engine.playNoise({ duration: 0.025, volume: 0.3, filter: { type: 'highpass', frequency: 2500 } });
    this.#engine.playTone({ waveform: 'square', frequency: 1800, duration: 0.015, volume: 0.05 });
  }

  flickerBuzz() {
    this.#engine.playTone({ waveform: 'sawtooth', frequency: 110, duration: 0.07, volume: 0.05 });
    this.#engine.playNoise({ duration: 0.05, volume: 0.05, filter: { type: 'highpass', frequency: 4000 } });
  }

  candyChime() {
    this.#engine.playTone({ waveform: 'triangle', frequency: 988, duration: 0.14, volume: 0.25 });
    this.#engine.playTone({ waveform: 'triangle', frequency: 1319, duration: 0.3, volume: 0.25, delay: 0.09 });
  }

  batteryCharge() {
    this.#engine.playTone({ waveform: 'square', frequency: 220, endFrequency: 880, duration: 0.22, volume: 0.08 });
    this.#engine.playTone({ frequency: 1760, duration: 0.15, volume: 0.12, delay: 0.2 });
  }

  candySparkle(position) {
    const output = this.#engine.createTemporarySpatialOutput(position, 0.5);
    this.#engine.playTone({ frequency: 2637, duration: 0.12, volume: 0.12, output });
    this.#engine.playTone({ frequency: 3520, duration: 0.16, volume: 0.09, delay: 0.08, output });
  }

  /** A breathy "ha-ha-ha", falling in pitch: buzzy syllables through a vowel-like filter. */
  laugh(position, pitch = 1, volume = 0.5) {
    const output = this.#engine.createTemporarySpatialOutput(position, LAUGH.syllables * LAUGH.spacing + 0.4);
    for (let syllable = 0; syllable < LAUGH.syllables; syllable++) {
      const delay = syllable * LAUGH.spacing;
      const frequency = LAUGH.pitch * pitch * (1 - syllable * LAUGH.pitchDrop);
      this.#engine.playTone({
        waveform: 'sawtooth',
        frequency: frequency * 1.1,
        endFrequency: frequency * 0.9,
        duration: LAUGH.length,
        volume: volume * 2.5 * (1 - syllable * 0.12),
        attack: 0.02,
        delay,
        filter: { type: 'bandpass', frequency: LAUGH.vowel * pitch, resonance: 5 },
        output,
      });
      this.#engine.playNoise({ duration: LAUGH.length * 0.8, volume: volume * 0.3, delay, filter: { type: 'bandpass', frequency: 1500, resonance: 1.5 }, output });
    }
  }

  giggle(position) {
    this.laugh(position, 1.9, 0.25);
  }

  /** The sharp intake when the ghost notices you. */
  gasp(position) {
    const output = this.#engine.createTemporarySpatialOutput(position, 0.8);
    this.#engine.playNoise({ duration: 0.7, volume: 0.5, attack: 0.3, filter: { type: 'bandpass', frequency: 500, endFrequency: 2600, resonance: 4 }, output });
  }

  banishShriek(position) {
    const output = this.#engine.createTemporarySpatialOutput(position, 1);
    this.#engine.playTone({ waveform: 'sawtooth', frequency: 300, endFrequency: 1800, duration: 0.45, volume: 0.35, attack: 0.02, output });
    this.#engine.playNoise({ duration: 0.7, volume: 0.4, filter: { type: 'bandpass', frequency: 2500, endFrequency: 600 }, output });
  }

  /** A floorboard or door creak: a wandering low buzz through a narrow band. Positioned unless `position` is null. */
  creak(position, volume = 0.35) {
    const duration = 0.9 + Math.random() * 0.6;
    const output = position ? this.#engine.createTemporarySpatialOutput(position, duration) : this.#engine.master;
    const pitchPath = randomWalk({ ...CREAK_PITCH_WALK, start: 80 + Math.random() * 40 });
    this.#engine.playTone({
      waveform: 'sawtooth',
      frequency: pitchPath[0],
      frequencyCurve: pitchPath,
      duration,
      volume: volume * 3,
      attack: 0.1,
      filter: { type: 'bandpass', frequency: 700, resonance: 6 },
      output,
    });
  }

  thump(position) {
    const output = this.#engine.createTemporarySpatialOutput(position, 0.6);
    this.#engine.playTone({ frequency: 80, endFrequency: 35, duration: 0.35, volume: 0.8, output });
    this.#engine.playNoise({ duration: 0.25, volume: 0.4, filter: { type: 'lowpass', frequency: 300 }, output });
  }

  boom() {
    this.#engine.playTone({ frequency: 55, endFrequency: 22, duration: 1.8, volume: 0.9, attack: 0.01 });
    this.#engine.playNoise({ duration: 1.4, volume: 0.5, filter: { type: 'lowpass', frequency: 400, endFrequency: 60 } });
  }

  doorUnlock() {
    this.#engine.playNoise({ duration: 0.06, volume: 0.5, filter: { type: 'bandpass', frequency: 3200, resonance: 3 } });
    this.#engine.playTone({ waveform: 'square', frequency: 900, endFrequency: 400, duration: 0.08, volume: 0.12 });
    this.creak(null, 0.5);
  }

  victory() {
    [523.3, 659.3, 784, 1046.5].forEach((frequency, index) =>
      this.#engine.playTone({ waveform: 'triangle', frequency, duration: 1.6 - index * 0.15, volume: 0.14, attack: 0.02, delay: index * 0.12 }),
    );
  }

  scream() {
    if (this.#screamSample) this.#engine.playSample(this.#screamSample);
    else this.#synthesizedScream();
  }

  /** Four detuned, wavering voices through heavy distortion, plus a hiss and a low hit. */
  #synthesizedScream() {
    const engine = this.#engine;
    const startTime = engine.now;
    const stopTime = startTime + SCREAM.duration + 0.05;
    const distortion = engine.context.createWaveShaper();
    distortion.curve = distortionCurve(30);
    const envelope = engine.createEnvelope(startTime, {
      volume: SCREAM.volume,
      attack: 0.03,
      duration: SCREAM.duration,
      sustainUntil: SCREAM.duration - SCREAM.release,
    });
    distortion.connect(envelope).connect(engine.master);

    for (const { frequency: baseFrequency, waveform } of SCREAM_VOICES) {
      const voice = engine.createOscillator(waveform, baseFrequency);
      voice.frequency.setValueAtTime(baseFrequency * 0.7, startTime);
      voice.frequency.exponentialRampToValueAtTime(baseFrequency * 1.25, startTime + 0.25);
      voice.frequency.exponentialRampToValueAtTime(baseFrequency, startTime + SCREAM.duration);
      const vibrato = engine.createOscillator('sine', 7 + Math.random() * 4);
      vibrato.connect(engine.createGain(baseFrequency * 0.06)).connect(voice.frequency);
      voice.connect(engine.createGain(0.25)).connect(distortion);
      for (const oscillator of [voice, vibrato]) {
        oscillator.start(startTime);
        oscillator.stop(stopTime);
      }
    }
    engine.playNoise({ duration: 1.2, volume: 0.6, attack: 0.01, filter: { type: 'bandpass', frequency: 3000, endFrequency: 1500, resonance: 0.8 } });
    engine.playTone({ frequency: 70, endFrequency: 30, duration: 0.8, volume: 0.9 });
  }
}

function distortionCurve(amount) {
  const samples = 1024, curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}
