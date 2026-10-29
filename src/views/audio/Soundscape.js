import { Countdown } from '../../utils.js';
import { setNodePosition } from './AudioEngine.js';

/** @typedef {import('../../types.js').Point3} Point3 */

const DRONE_PITCHES = [55, 55.4, 82.6];
const GHOST_VOICE_SMOOTHING = 0.3;
const SHUDDER_LEVEL = 0.25;
const HEARTBEAT = Object.freeze({ slowestInterval: 1.15, speedUp: 0.7, minCloseness: 0.02, quietest: 0.2, loudnessRange: 0.7, secondBeatDelay: 0.17 });

/** The continuous layer: the drone under everything, the ghost's 3D voice, and the heartbeat. */
export class Soundscape {
  #engine;
  #drone = null;
  #ghostOutput = null;
  #ghostLevel = null;
  #shudder = null;
  #heartbeat = new Countdown();

  constructor(engine) {
    this.#engine = engine;
  }

  /** Builds the always-running voices. Call once, after the engine has started. */
  build(initialDroneLevel) {
    this.#buildDrone();
    this.#buildGhostVoice();
    this.setDroneLevel(initialDroneLevel, 2);
  }

  setDroneLevel(level, seconds = 1) {
    const gain = this.#drone.gain, now = this.#engine.now;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(level, now + seconds);
  }

  /**
   * @param {Point3 | null} position - Where the voice comes from, or null to leave it where it is.
   * @param {number} level - How loud the voice is.
   * @param {boolean} isFrozen - Whether to add the shudder the ghost makes while frozen.
   */
  setGhostPresence(position, level, isFrozen) {
    if (position) setNodePosition(this.#ghostOutput, position);
    const now = this.#engine.now;
    this.#ghostLevel.gain.setTargetAtTime(level, now, GHOST_VOICE_SMOOTHING);
    this.#shudder.gain.setTargetAtTime(isFrozen ? SHUDDER_LEVEL : 0, now, 0.05);
  }

  silenceGhost() {
    this.setGhostPresence(null, 0, false);
  }

  resetHeartbeat() {
    this.#heartbeat.restart(0);
  }

  /** Lub-dub, faster and louder as `closeness` (0 to 1) rises. */
  updateHeartbeat(seconds, closeness) {
    if (closeness <= HEARTBEAT.minCloseness) {
      this.resetHeartbeat();
      return;
    }
    if (!this.#heartbeat.tick(seconds)) return;
    this.#heartbeat.restart(HEARTBEAT.slowestInterval - HEARTBEAT.speedUp * closeness);
    const volume = HEARTBEAT.quietest + HEARTBEAT.loudnessRange * closeness;
    this.#engine.playTone({ frequency: 62, endFrequency: 40, duration: 0.14, volume, attack: 0.01 });
    this.#engine.playTone({ frequency: 55, endFrequency: 36, duration: 0.14, volume: volume * 0.7, attack: 0.01, delay: HEARTBEAT.secondBeatDelay });
  }

  /** Low detuned saws through a slowly sweeping filter, plus wind. */
  #buildDrone() {
    const engine = this.#engine;
    this.#drone = engine.createGain(0);
    this.#drone.connect(engine.master);
    const tone = engine.createFilter('lowpass', 180, 3);
    tone.connect(this.#drone);
    for (const pitch of DRONE_PITCHES) {
      const voice = engine.createOscillator('sawtooth', pitch);
      voice.connect(engine.createGain(0.1)).connect(tone);
      voice.start();
    }
    engine.modulate(tone.frequency, 0.06, 90);

    const wind = engine.createFilter('bandpass', 500, 0.7);
    const windLevel = engine.createGain(0.06);
    engine.createLoopingNoise().connect(wind).connect(windLevel).connect(this.#drone);
    engine.modulate(wind.frequency, 0.11, 300);
    engine.modulate(windLevel.gain, 0.07, 0.04);
  }

  /** A breathing whisper, a wobbling moan, and a buzz for when it's frozen, all from one 3D point. */
  #buildGhostVoice() {
    const engine = this.#engine;
    this.#ghostOutput = engine.createSpatialOutput();
    this.#ghostLevel = engine.createGain(0);
    this.#ghostLevel.connect(this.#ghostOutput);

    const whisper = engine.createFilter('bandpass', 1100, 2.5);
    const breath = engine.createGain(0.22);
    engine.modulate(breath.gain, 0.4, 0.2);
    engine.modulate(whisper.frequency, 0.23, 500);
    engine.createLoopingNoise().connect(whisper).connect(breath).connect(this.#ghostLevel);

    const moan = engine.createOscillator('triangle', 140);
    engine.modulate(moan.frequency, 5.5, 5);
    engine.modulate(moan.frequency, 0.09, 35);
    moan.connect(engine.createGain(0.12)).connect(this.#ghostLevel);
    moan.start();

    const buzz = engine.createOscillator('sawtooth', 72);
    const tremolo = engine.createGain(0.5);
    engine.modulate(tremolo.gain, 17, 0.5, 'square');
    this.#shudder = engine.createGain(0);
    buzz.connect(tremolo).connect(this.#shudder).connect(this.#ghostLevel);
    buzz.start();
  }
}
