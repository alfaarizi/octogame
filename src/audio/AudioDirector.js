import { GameEvent } from '../core/GameEvent.js';
import { AmbientNoiseKind } from '../gameplay/cues/AmbientNoiseCue.js';
import { SoundLibrary } from './SoundLibrary.js';
import { Soundscape } from './Soundscape.js';

const DroneLevel = Object.freeze({ IDLE: 0.35, ROUND: 0.55, CHASE: 0.9 });
const GhostVoiceLevel = Object.freeze({ HUNTING: 1, NEARBY: 0.6, ABSENT: 0 });
const GHOST_VOICE_HEIGHT = 1.4;

const atVoiceHeight = ({ x, z }) => ({ x, y: GHOST_VOICE_HEIGHT, z });

/**
 * Decides what the game sounds like: plays the right effect for each game event, and keeps the
 * continuous soundscape (drone, ghost voice, heartbeat, listener position) in step every frame.
 */
export class AudioDirector {
  #engine;
  #library;
  #soundscape;
  #screamSamplePaths;

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
   * @param frame.listener  { position: {x,y,z}, direction: {x,y,z} } — the player's ears
   * @param frame.ghost     { position: {x,z}, isPresent, isHunting, isFrozen }
   * @param frame.threatCloseness 0–1
   */
  updateSoundscape(seconds, { listener, ghost, threatCloseness }) {
    if (!this.#engine.isStarted) return;
    this.#engine.setListenerPose(listener.position, listener.direction);
    const level = !ghost.isPresent ? GhostVoiceLevel.ABSENT : ghost.isHunting ? GhostVoiceLevel.HUNTING : GhostVoiceLevel.NEARBY;
    this.#soundscape.setGhostPresence(atVoiceHeight(ghost.position), level, ghost.isFrozen);
    this.#soundscape.updateHeartbeat(seconds, threatCloseness);
  }

  #subscribe(events) {
    const library = this.#library, soundscape = this.#soundscape;
    const on = (type, play) => events.on(type, (payload) => this.#engine.isStarted && play(payload));

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

    on(GameEvent.AMBIENT_NOISE, ({ kind, position }) => {
      if (kind === AmbientNoiseKind.CREAK) library.creak(position);
      else if (kind === AmbientNoiseKind.THUMP) library.thump(position);
      else library.giggle(position);
    });
  }
}
