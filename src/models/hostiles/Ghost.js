import { GameEvent } from '../../core/GameEvent.js';
import { Countdown, distanceBetween, headingTo } from '../../utils.js';
import { GhostState, PRESENT_GHOST_STATES } from './GhostState.js';

/** @typedef {import('../../types.js').Point3} Point3 */
/** @typedef {import('./GhostState.js').GhostStateName} GhostStateName */

/**
 * What the ghost needs to know each frame.
 * @typedef {object} GhostSituation
 * @property {Point3} playerPosition
 * @property {boolean} playerLightOn - Whether the flashlight is lit; a lit one can be seen from much farther away.
 * @property {boolean} isLit - Whether the beam is on the ghost right now.
 * @property {number} candiesCollected - Candies found so far; each one makes the ghost hunt faster.
 */

/**
 * How the ghost behaves. It drifts straight through walls and floors (slower inside walls), freezes while lit,
 * is banished by enough light, and catches the player on contact.
 *
 *   DORMANT --wake--> WANDERING <-> HUNTING <-> FROZEN --enough light--> BANISHED --respawn--> WANDERING / HUNTING
 */
export class Ghost {
  /** @type {Point3} Where it hovers above. */
  position = { x: 0, y: 0, z: 0 };
  /** Direction it last drifted, in radians (0 faces +z). */
  heading = 0;
  #config;
  #building;
  #spawnTable;
  #events;
  /** @type {GhostStateName} */
  #state = GhostState.DORMANT;
  /** Runs while DORMANT (until it wakes) and while BANISHED (until it respawns). */
  #stateTimer = new Countdown(Infinity);
  /** Seconds spent in the beam; drains while unlit. */
  #exposure = 0;
  #outOfSightTime = 0;
  #isEnraged = false;
  /** @type {Point3} */
  #wanderTarget = { x: 0, y: 0, z: 0 };

  /**
   * @param {object} dependencies
   * @param {typeof import('../../config/gameConfig.js').GAME_CONFIG['ghost']} dependencies.config
   * @param {Pick<import('../world/Building.js').Building, 'isOpaque' | 'hasLineOfSight'>} dependencies.building
   * @param {Pick<import('../world/SpawnTable.js').SpawnTable, 'randomGhostSpot' | 'ghostSpotFarFrom'>} dependencies.spawnTable
   * @param {Pick<import('../../core/EventBus.js').EventBus, 'emit'>} dependencies.events
   */
  constructor({ config, building, spawnTable, events }) {
    this.#config = config;
    this.#building = building;
    this.#spawnTable = spawnTable;
    this.#events = events;
  }

  get state() {
    return this.#state;
  }

  /** In the office: visible, lightable and dangerous. */
  get isPresent() {
    return PRESENT_GHOST_STATES.has(this.#state);
  }

  get isEnraged() {
    return this.#isEnraged;
  }

  /** Puts the ghost to sleep at `spawnPoint` until `dormantSeconds` have passed. */
  reset(spawnPoint, dormantSeconds) {
    this.#appearAt(spawnPoint, GhostState.DORMANT);
    this.#stateTimer.restart(dormantSeconds);
    this.#isEnraged = false;
  }

  /** Takes the ghost out of play between rounds. */
  deactivate() {
    this.#state = GhostState.DORMANT;
    this.#stateTimer.restart(Infinity);
  }

  /** After the last candy: faster, never gives up, and comes back sooner if it's away. */
  enrage() {
    this.#isEnraged = true;
    if (this.#state === GhostState.DORMANT || this.#state === GhostState.BANISHED) {
      this.#stateTimer.restart(Math.min(this.#stateTimer.remaining, this.#config.enragedRespawnDelay));
    } else if (this.#state === GhostState.WANDERING) {
      this.#state = GhostState.HUNTING;
    }
  }

  /**
   * @param {number} seconds - Time since the last frame.
   * @param {GhostSituation} situation - What the ghost knows about the player this frame.
   */
  update(seconds, situation) {
    if (this.#state === GhostState.DORMANT) this.#updateDormant(seconds);
    else if (this.#state === GhostState.BANISHED) this.#updateBanished(seconds, situation);
    else this.#updatePresent(seconds, situation);
  }

  #updateDormant(seconds) {
    if (!this.#stateTimer.tick(seconds)) return;
    this.#appearAt(this.position, GhostState.WANDERING);
    this.#announce(GameEvent.GHOST_WOKE);
  }

  #updateBanished(seconds, situation) {
    if (!this.#stateTimer.tick(seconds)) return;
    const spot = this.#spawnTable.ghostSpotFarFrom(situation.playerPosition);
    this.#appearAt(spot, this.#isEnraged ? GhostState.HUNTING : GhostState.WANDERING);
    this.#announce(GameEvent.GHOST_RESPAWNED);
  }

  #updatePresent(seconds, situation) {
    if (this.#absorbLight(seconds, situation.isLit)) return;
    const distance = distanceBetween(this.position, situation.playerPosition);
    if (this.#state === GhostState.WANDERING) this.#wander(seconds, situation, distance);
    if (this.#state === GhostState.HUNTING) this.#hunt(seconds, situation, distance);
    if (distance < this.#config.catchDistance) this.#events.emit(GameEvent.PLAYER_CAUGHT);
  }

  /** Freezes while lit and builds up exposure. Returns true if the light just banished it. */
  #absorbLight(seconds, isLit) {
    if (!isLit) {
      this.#exposure = Math.max(0, this.#exposure - seconds);
      if (this.#state === GhostState.FROZEN) this.#state = GhostState.HUNTING;
      return false;
    }
    this.#state = GhostState.FROZEN;
    this.#exposure += seconds;
    if (this.#exposure < this.#config.banishExposure) return false;
    this.#state = GhostState.BANISHED;
    this.#stateTimer.restart(this.#config.respawnDelay);
    this.#announce(GameEvent.GHOST_BANISHED);
    return true;
  }

  #wander(seconds, situation, distance) {
    const { senseRadius, spotRadius, wanderSpeed, arrivalDistance } = this.#config;
    const noticesPlayer =
      distance < senseRadius ||
      (situation.playerLightOn && distance < spotRadius && this.#canSee(situation.playerPosition));
    if (noticesPlayer || this.#isEnraged) {
      this.#startHunting();
      return;
    }
    if (this.#driftToward(this.#wanderTarget, wanderSpeed, seconds) < arrivalDistance) {
      this.#wanderTarget = this.#spawnTable.randomGhostSpot();
    }
  }

  #startHunting() {
    this.#state = GhostState.HUNTING;
    this.#outOfSightTime = 0;
    this.#announce(GameEvent.GHOST_SPOTTED_PLAYER);
  }

  #hunt(seconds, situation, distance) {
    this.#driftToward(situation.playerPosition, this.#huntSpeed(situation.candiesCollected), seconds);
    if (this.#isEnraged) return;
    // Far away and out of sight for long enough: it gives up and drifts off.
    const hasLostTrack = distance > this.#config.loseInterestDistance && !this.#canSee(situation.playerPosition);
    this.#outOfSightTime = hasLostTrack ? this.#outOfSightTime + seconds : 0;
    if (this.#outOfSightTime > this.#config.loseInterestTime) {
      this.#state = GhostState.WANDERING;
      this.#wanderTarget = this.#spawnTable.randomGhostSpot();
    }
  }

  #huntSpeed(candiesCollected) {
    const { enragedSpeed, huntSpeed, huntSpeedPerCandy } = this.#config;
    return this.#isEnraged ? enragedSpeed : huntSpeed + huntSpeedPerCandy * candiesCollected;
  }

  /**
   * Moves straight at `target`, up or down through floors if it must.
   * @param {Point3} target
   * @returns {number} How far is left to go.
   */
  #driftToward(target, speed, seconds) {
    const position = this.position, distance = distanceBetween(position, target);
    if (distance < 1e-3) return 0;
    const isInsideWall = this.#building.isOpaque(position);
    const step = Math.min(distance, speed * seconds * (isInsideWall ? this.#config.insideWallSpeedFactor : 1));
    this.heading = headingTo(position, target);
    for (const axis of /** @type {const} */ (['x', 'y', 'z'])) position[axis] += ((target[axis] - position[axis]) / distance) * step;
    return distance - step;
  }

  #canSee(point) {
    return this.#building.hasLineOfSight(this.position, point);
  }

  /** @param {Point3} spot */
  #appearAt({ x, y, z }, state) {
    Object.assign(this.position, { x, y, z });
    this.#state = state;
    this.#exposure = 0;
    this.#outOfSightTime = 0;
    this.#wanderTarget = this.#spawnTable.randomGhostSpot();
  }

  /** Emits `type` with a copy of where the ghost is now. */
  #announce(type) {
    this.#events.emit(type, { position: { ...this.position } });
  }
}
