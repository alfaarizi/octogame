import { GameEvent } from '../core/GameEvent.js';
import { above, distanceBetween, isWithinCone } from '../utils.js';
import { ExitDoor } from '../world/ExitDoor.js';
import { AmbientNoiseCue } from './cues/AmbientNoiseCue.js';
import { CandyNearbyCue } from './cues/CandyNearbyCue.js';
import { FootstepCue } from './cues/FootstepCue.js';
import { Ghost } from './hostiles/Ghost.js';
import { measureThreat, NO_THREAT } from './hostiles/threat.js';
import { PickupField, PickupKind } from './pickups/PickupField.js';
import { Flashlight } from './player/Flashlight.js';
import { Player } from './player/Player.js';
import { Round, RoundOutcome } from './round/Round.js';

/** @typedef {import('../types.js').MovementIntent} MovementIntent */
/** @typedef {import('../types.js').Point3} Point3 */
/** @typedef {import('../types.js').SpawnPoint} SpawnPoint */
/** @typedef {import('./hostiles/threat.js').Threat} Threat */

/**
 * Where a round starts and ends.
 * @typedef {object} SimulationLayout
 * @property {SpawnPoint} playerStart
 * @property {Point3} ghostStart
 * @property {import('../world/ExitDoor.js').ExitDoorPlacement} exitDoor
 */

/**
 * The input the player gives in one frame.
 * @typedef {object} Controls
 * @property {MovementIntent} intent
 * @property {{ x: number, y: number }} look - Mouse movement in pixels.
 */

/**
 * The rules of a round, one frame at a time: the player moves, the flashlight drains, the ghost hunts,
 * pickups are collected, and the round ends when the player escapes or is caught. Plain JavaScript
 * with no rendering or audio, so it runs in the Node unit tests.
 */
export class Simulation {
  /** @readonly */ exitDoor;
  /** @readonly */ round;
  /** @readonly */ player;
  /** @readonly */ flashlight;
  /** @readonly */ ghost;
  /** @readonly */ pickups;
  #config;
  #events;
  #building;
  #spawnTable;
  #layout;
  #footsteps;
  #candySparkle;
  #ambientNoise;
  #outcome = null;
  /** @type {Threat} */
  #threat = NO_THREAT;

  /**
   * @param {object} dependencies
   * @param {typeof import('../config/gameConfig.js').GAME_CONFIG} dependencies.config
   * @param {import('../core/EventBus.js').EventBus} dependencies.events
   * @param {import('../world/Building.js').Building} dependencies.building
   * @param {import('../world/SpawnTable.js').SpawnTable} dependencies.spawnTable
   * @param {SimulationLayout} dependencies.layout
   */
  constructor({ config, events, building, spawnTable, layout }) {
    this.#config = config;
    this.#events = events;
    this.#building = building;
    this.#spawnTable = spawnTable;
    this.#layout = layout;
    this.exitDoor = new ExitDoor(layout.exitDoor);
    this.round = new Round({ events, exitDoor: this.exitDoor, candiesRequired: config.round.candiesRequired });
    this.player = new Player(config.player, building);
    this.flashlight = new Flashlight(config.flashlight, events);
    this.ghost = new Ghost({ config: config.ghost, building, spawnTable, events });
    this.pickups = new PickupField(config.player);
    this.#footsteps = new FootstepCue(events, config.player);
    this.#candySparkle = new CandyNearbyCue(events, config.round);
    this.#ambientNoise = new AmbientNoiseCue(events, config.round);

    events.on(GameEvent.EXIT_UNLOCKED, () => this.ghost.enrage());
    events.on(GameEvent.PLAYER_CAUGHT, () => (this.#outcome ??= RoundOutcome.CAUGHT));
  }

  /** How close the ghost was at the end of the last step. */
  get threat() {
    return this.#threat;
  }

  /** Sets up a fresh round: new pickups, the player at the door, a full battery and the ghost asleep. */
  startRound() {
    const { candiesRequired, batteriesPlaced, ghostGracePeriod } = this.#config.round;
    this.#outcome = null;
    this.#threat = NO_THREAT;
    this.round.start();
    this.pickups.populate({
      candySpots: this.#spawnTable.pickCandySpots(candiesRequired),
      batterySpots: this.#spawnTable.pickBatterySpots(batteriesPlaced),
    });
    this.player.respawn(this.#layout.playerStart);
    this.flashlight.reset();
    this.ghost.reset(this.#layout.ghostStart, ghostGracePeriod);
    for (const cue of [this.#footsteps, this.#candySparkle, this.#ambientNoise]) cue.reset();
  }

  /** Takes the ghost out of play once the round is over. */
  endRound() {
    this.ghost.deactivate();
  }

  /** Empties the office between players: no ghost, no pickups, and the exit locked. */
  clear() {
    this.endRound();
    this.pickups.clear();
    this.exitDoor.lock();
  }

  /**
   * Advances the round by one frame.
   * @param {number} seconds - Time since the last frame.
   * @param {Controls} controls
   * @returns {string | null} A RoundOutcome value once the round is over, otherwise null.
   */
  step(seconds, { intent, look }) {
    const { round, player, flashlight, ghost, pickups } = this;
    round.tick(seconds);
    player.look(look.x, look.y);
    this.#footsteps.update(seconds, player.update(seconds, intent));

    this.#threat = ghost.isPresent ? measureThreat(distanceBetween(ghost.position, player.position), this.#config.ghost) : NO_THREAT;
    flashlight.update(seconds, round.elapsed, this.#threat.interference);
    ghost.update(seconds, {
      playerPosition: player.position,
      playerLightOn: flashlight.isEmitting,
      isLit: this.#isGhostLit(),
      candiesCollected: round.candiesCollected,
    });
    if (this.#outcome) return this.#outcome;

    this.#collectPickups();
    if (this.exitDoor.isReachedBy(player.position)) {
      this.#outcome = RoundOutcome.ESCAPED;
      this.#events.emit(GameEvent.PLAYER_ESCAPED);
      return this.#outcome;
    }
    this.#candySparkle.update(seconds, pickups.nearest(PickupKind.CANDY, player.position));
    this.#ambientNoise.update(seconds, player.position);
    return null;
  }

  /** Whether the beam's strong center is on the ghost, with no wall or floor in the way. */
  #isGhostLit() {
    const { player, ghost } = this;
    if (!this.flashlight.isEmitting || !ghost.isPresent) return false;
    const { bodyCenterHeight, bodyRadius } = this.#config.ghost;
    return (
      isWithinCone(player.sight, this.#config.flashlight.freezeCone, above(ghost.position, bodyCenterHeight), bodyRadius) &&
      this.#building.hasLineOfSight(player.position, ghost.position)
    );
  }

  #collectPickups() {
    for (const item of this.pickups.collectWithinReach(this.player.position)) {
      if (item.kind === PickupKind.CANDY) {
        this.round.recordCandy();
      } else {
        this.flashlight.recharge(this.#config.flashlight.batteryPickupCharge);
        this.#events.emit(GameEvent.BATTERY_COLLECTED);
      }
    }
  }
}
