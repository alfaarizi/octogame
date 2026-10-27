const NOISE_BUFFER_SECONDS = 2;
const SILENCE = 0.0001; // exponential ramps can't reach exactly 0
const TAIL_SECONDS = 0.05; // sources stop a moment after their envelope has faded
const SPATIAL_SETTINGS = Object.freeze({ panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 1.5, rolloffFactor: 1.2, maxDistance: 40 });

/**
 * @typedef {object} SoundShape  how a one-off sound is played
 * @property {number} duration
 * @property {number} [volume]  peak loudness
 * @property {number} [attack]  seconds to reach the peak
 * @property {number} [delay]   seconds from now before it starts
 * @property {{ type: BiquadFilterType, frequency: number, endFrequency?: number, resonance?: number }} [filter]
 * @property {AudioNode} [output]  defaults to the master volume
 */

/**
 * Web Audio plumbing: the context, master volume, the 3D listener, and the basic voices
 * (tones, filtered noise, LFOs, samples) that every sound in the game is built from.
 */
export class AudioEngine {
  #masterVolume;
  #context = null;
  #master = null;
  #noise = null;

  constructor({ masterVolume }) {
    this.#masterVolume = masterVolume;
  }

  get isStarted() {
    return this.#context !== null;
  }

  get context() {
    return this.#context;
  }

  get master() {
    return this.#master;
  }

  get now() {
    return this.#context.currentTime;
  }

  /**
   * Creates the audio context, or resumes it if it already exists. Browsers only allow this
   * inside a click or key press. Returns true the first time, when callers should build their sounds.
   */
  start() {
    if (this.#context) {
      this.#context.resume();
      return false;
    }
    this.#context = new AudioContext();
    const compressor = this.#context.createDynamicsCompressor();
    compressor.connect(this.#context.destination);
    this.#master = this.createGain(this.#masterVolume);
    this.#master.connect(compressor);
    this.#noise = this.#createNoiseBuffer();
    return true;
  }

  suspend() {
    this.#context?.suspend();
  }

  resume() {
    this.#context?.resume();
  }

  setListenerPose(position, forward) {
    const listener = this.#context.listener;
    if (listener.positionX) {
      listener.positionX.value = position.x;
      listener.positionY.value = position.y;
      listener.positionZ.value = position.z;
      listener.forwardX.value = forward.x;
      listener.forwardY.value = forward.y;
      listener.forwardZ.value = forward.z;
      listener.upX.value = 0;
      listener.upY.value = 1;
      listener.upZ.value = 0;
    } else {
      // Older Safari only has the deprecated setters.
      listener.setPosition(position.x, position.y, position.z);
      listener.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
    }
  }

  // ---- nodes ----

  /** A 3D output at `position` (or wherever it's moved later) that sounds can be routed into. */
  createSpatialOutput(position = null) {
    const panner = this.#context.createPanner();
    Object.assign(panner, SPATIAL_SETTINGS);
    if (position) setNodePosition(panner, position);
    panner.connect(this.#master);
    return panner;
  }

  /** A 3D output for a one-off sound, disconnected once the sound is over. */
  createTemporarySpatialOutput(position, lifetimeSeconds) {
    const panner = this.createSpatialOutput(position);
    setTimeout(() => panner.disconnect(), (lifetimeSeconds + 0.5) * 1000);
    return panner;
  }

  createGain(value) {
    const gain = this.#context.createGain();
    gain.gain.value = value;
    return gain;
  }

  createFilter(type, frequency, resonance = 1) {
    const filter = this.#context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = resonance;
    return filter;
  }

  createOscillator(waveform, frequency) {
    const oscillator = this.#context.createOscillator();
    oscillator.type = waveform;
    oscillator.frequency.value = frequency;
    return oscillator;
  }

  /** Endless white noise, already playing. */
  createLoopingNoise() {
    const source = this.#createNoiseSource();
    source.loop = true;
    source.start();
    return source;
  }

  /** Wobbles `param` around its current value by ±depth at `rate` Hz, forever. */
  modulate(param, rate, depth, waveform = 'sine') {
    const oscillator = this.createOscillator(waveform, rate);
    oscillator.connect(this.createGain(depth)).connect(param);
    oscillator.start();
  }

  /**
   * A gain that swells to `volume` over `attack` seconds, holds until `sustainUntil` (if given),
   * then fades out by `duration`. All times are measured from `startTime`.
   */
  createEnvelope(startTime, { volume, attack, duration, sustainUntil = 0 }) {
    const envelope = this.#context.createGain();
    const peak = Math.max(volume, SILENCE * 2);
    envelope.gain.setValueAtTime(SILENCE, startTime);
    envelope.gain.exponentialRampToValueAtTime(peak, startTime + attack);
    if (sustainUntil > attack) envelope.gain.setValueAtTime(peak, startTime + sustainUntil);
    envelope.gain.exponentialRampToValueAtTime(SILENCE, startTime + Math.max(duration, attack + 0.01));
    return envelope;
  }

  // ---- one-off sounds ----

  /**
   * An oscillator note. Its pitch glides from `frequency` to `endFrequency`, or follows
   * `frequencyCurve` (an array of Hz values spread over the note).
   * @param {SoundShape & { waveform?: OscillatorType, frequency: number, endFrequency?: number, frequencyCurve?: Float32Array }} sound
   */
  playTone({ waveform = 'sine', frequency, endFrequency = frequency, frequencyCurve = null, ...shape }) {
    const startTime = this.now + (shape.delay ?? 0);
    const oscillator = this.createOscillator(waveform, frequency);
    if (frequencyCurve) oscillator.frequency.setValueCurveAtTime(frequencyCurve, startTime, shape.duration);
    else glide(oscillator.frequency, frequency, endFrequency, startTime, shape.duration);
    this.#schedule(oscillator, startTime, shape);
  }

  /** A burst of white noise, usually shaped by `filter`. @param {SoundShape} shape */
  playNoise(shape) {
    const startTime = this.now + (shape.delay ?? 0);
    this.#schedule(this.#createNoiseSource(), startTime, shape, Math.random());
  }

  /** Loads the first of `paths` that exists and decodes. Resolves to null if none do. */
  async loadFirstAvailableSample(paths) {
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (!response.ok) continue;
        return await this.#context.decodeAudioData(await response.arrayBuffer());
      } catch {
        // Missing or unreadable: try the next one.
      }
    }
    return null;
  }

  playSample(buffer, output = this.#master) {
    const source = this.#context.createBufferSource();
    source.buffer = buffer;
    source.connect(output);
    source.start();
  }

  /** source → (filter) → envelope → output, started at `startTime` and stopped once faded. */
  #schedule(source, startTime, { duration, volume = 0.3, attack = 0.005, filter = null, output = this.#master }, startOffset = 0) {
    let signal = source;
    if (filter) {
      const { type, frequency, endFrequency = frequency, resonance = 1 } = filter;
      const shaping = this.createFilter(type, frequency, resonance);
      glide(shaping.frequency, frequency, endFrequency, startTime, duration);
      signal = signal.connect(shaping);
    }
    signal.connect(this.createEnvelope(startTime, { volume, attack, duration })).connect(output);
    source.start(startTime, startOffset);
    source.stop(startTime + duration + TAIL_SECONDS);
  }

  #createNoiseSource() {
    const source = this.#context.createBufferSource();
    source.buffer = this.#noise;
    return source;
  }

  #createNoiseBuffer() {
    const { sampleRate } = this.#context;
    const buffer = this.#context.createBuffer(1, sampleRate * NOISE_BUFFER_SECONDS, sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    return buffer;
  }
}

/** Sets `param` to `from` at `startTime`, sliding to `to` over `duration` if they differ. */
function glide(param, from, to, startTime, duration) {
  param.setValueAtTime(from, startTime);
  if (to !== from) param.exponentialRampToValueAtTime(to, startTime + duration);
}

export function setNodePosition(node, { x, y, z }) {
  if (node.positionX) {
    node.positionX.value = x;
    node.positionY.value = y;
    node.positionZ.value = z;
  } else {
    node.setPosition(x, y, z);
  }
}
