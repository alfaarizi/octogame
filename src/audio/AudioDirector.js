import { GameEvent } from '../core/GameEvent.js';
import { AmbientNoiseKind } from '../gameplay/cues/AmbientNoiseCue.js';
import { GhostState } from '../gameplay/hostiles/GhostState.js';
import { atHeight } from '../utils.js';
import { SoundLibrary } from './SoundLibrary.js';
import { Soundscape } from './Soundscape.js';

/** @typedef {import('../gameplay/hostiles/Ghost.js').Ghost} Ghost */
/** @typedef {import('../types.js').FloorPoint} FloorPoint */
/** @typedef {import('../types.js').Ray} Ray */

const DroneLevel = Object.freeze({ IDLE: 0.35, ROUND: 0.55, CHASE: 0.9 });
const GhostVoiceLevel = Object.freeze({ HUNTING: 1, NEARBY: 0.6, ABSENT: 0 });
const GHOST_VOICE_HEIGHT = 1.4;

/** @param {FloorPoint} position */
const atVoiceHeight = (position) => atHeight(position, GHOST_VOICE_HEIGHT);

/** @param {Ghost} ghost */
function ghostVoiceLevel(ghost) {
  if (!ghost.isPresent) return GhostVoiceLevel.ABSENT;
  return ghost.state === GhostState.HUNTING ? GhostVoiceLevel.HUNTING : GhostVoiceLevel.NEARBY;
}

/**
 * Decides what the game sounds like: plays the right effect for each game event, and keeps the
 * continuous soundscape (drone, ghost voice, heartbeat, listener position) in step every frame.
 */
export class AudioDirector {
  #engine;
  #library;
  #soundscape;
  #screamSamplePaths;

  /**
   * @param {object} dependencies
   * @param {import('./AudioEngine.js').AudioEngine} dependencies.engine
   * @param {import('../core/EventBus.js').EventBus} dependencies.events
   * @param {string[]} dependencies.screamSamplePaths - Recordings to try before falling back to the synthesized scream.
   */
  constructor({ engine, events, screamSamplePaths }) {
    this.#engine = engine;
    this.#library = new SoundLibrary(engine);
    this.#soundscape = new Soundscape(engine);
    this.#screamSamplePaths = screamSamplePaths;
    this.#subscribe(events);
  }

  /** Starts (or resumes) audio. Must be called from a click or key press. */
  start() {
    if (!this.#engine.start()) return;
    this.#soundscape.build(DroneLevel.IDLE);
    this.#library.loadScreamSample(this.#screamSamplePaths);
  }

  suspend() {
    this.#engine.suspend();
  }

  /**
   * @param {number} seconds - Time since the last frame.
   * @param {object} frame - The state of the round this frame.
   * @param {Ray} frame.listener - The player's ears.
   * @param {Ghost} frame.ghost
   * @param {number} frame.threatCloseness - How close the ghost is, from 0 to 1.
   */
  updateSoundscape(seconds, { listener, ghost, threatCloseness }) {
    if (!this.#engine.isStarted) return;
    this.#engine.setListener(listener);
    this.#soundscape.setGhostPresence(atVoiceHeight(ghost.position), ghostVoiceLevel(ghost), ghost.state === GhostState.FROZEN);
    this.#soundscape.updateHeartbeat(seconds, threatCloseness);
  }

  #subscribe(events) {
    const library = this.#library, soundscape = this.#soundscape;
    const on = (type, play) => events.on(type, (payload) => this.#engine.isStarted && play(payload));
    const playAmbientNoise = {
      [AmbientNoiseKind.CREAK]: (position) => library.creak(position),
      [AmbientNoiseKind.THUMP]: (position) => library.thump(position),
      [AmbientNoiseKind.GIGGLE]: (position) => library.giggle(position),
    };

    on(GameEvent.ROUND_STARTED, () => {
      soundscape.setDroneLevel(DroneLevel.ROUND, 2);
      soundscape.resetHeartbeat();
    });
    on(GameEvent.ROUND_ENDED, () => {
      soundscape.silenceGhost();
      soundscape.setDroneLevel(DroneLevel.IDLE, 1.5);
    });
    on(GameEvent.GAME_PAUSED, () => this.#engine.suspend());
    on(GameEvent.GAME_RESUMED, () => this.#engine.resume());

    on(GameEvent.PLAYER_STEPPED, ({ sprinting }) => library.footstep(sprinting));
    on(GameEvent.PLAYER_CAUGHT, () => soundscape.silenceGhost());
    on(GameEvent.PLAYER_ESCAPED, () => library.victory());
    on(GameEvent.JUMP_SCARE_STARTED, ({ gentle, listenerPosition }) => (gentle ? library.thump(listenerPosition) : library.scream()));

    on(GameEvent.CANDY_COLLECTED, () => library.candyChime());
    on(GameEvent.CANDY_NEARBY, ({ position }) => library.candySparkle(position));
    on(GameEvent.BATTERY_COLLECTED, () => library.batteryCharge());
    on(GameEvent.EXIT_UNLOCKED, () => {
      library.boom();
      library.doorUnlock();
      soundscape.setDroneLevel(DroneLevel.CHASE, 0.5);
    });

    on(GameEvent.FLASHLIGHT_TOGGLED, () => library.switchClick());
    on(GameEvent.FLASHLIGHT_TOGGLE_FAILED, () => library.switchClick());
    on(GameEvent.FLASHLIGHT_FLICKERED, () => library.flickerBuzz());

    on(GameEvent.GHOST_WOKE, ({ position }) => library.laugh(atVoiceHeight(position)));
    on(GameEvent.GHOST_SPOTTED_PLAYER, ({ position }) => library.gasp(atVoiceHeight(position)));
    on(GameEvent.GHOST_BANISHED, ({ position }) => library.banishShriek(atVoiceHeight(position)));

    on(GameEvent.AMBIENT_NOISE, ({ kind, position }) => playAmbientNoise[kind](position));
  }
}
