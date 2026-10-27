import { GameEvent } from '../../core/GameEvent.js';
import { headingTo, planarDistance } from '../../utils.js';
import { GhostState, PRESENT_GHOST_STATES } from './GhostState.js';

/**
 * What the ghost needs to know each frame.
 * @typedef {object} GhostSituation
 * @property {{ x: number, z: number }} playerPosition - Where the player stands on the floor plan.
 * @property {boolean} playerLightOn - Whether the flashlight is lit; a lit one can be seen from much farther away.
 * @property {boolean} isLit - Whether the beam is on the ghost right now.
 * @property {number} candiesCollected - Candies found so far; each one makes the ghost hunt faster.
 */

/**
 * How the ghost behaves. It drifts straight through walls (slower inside them), freezes while lit,
 * is banished by enough light, and catches the player on contact.
 *
 *   DORMANT --wake--> WANDERING <-> HUNTING <-> FROZEN --enough light--> BANISHED --respawn--> WANDERING / HUNTING
 */
export class Ghost {
  position = { x: 0, z: 0 };
  /** Direction it last drifted, in radians (0 faces +z). */
  heading = 0;
  #config;
  #tileMap;
  #spawnTable;
  #events;
  #state = GhostState.DORMANT;
  /** Seconds until DORMANT wakes or BANISHED respawns. */
  #stateCountdown = Infinity;
  /** Seconds spent in the beam; drains while unlit. */
  #exposure = 0;
  #outOfSightTime = 0;
  #isEnraged = false;
  #wanderTarget = { x: 0, z: 0 };

  constructor({ config, tileMap, spawnTable, events }) {
    this.#config = config;
    this.#tileMap = tileMap;
    this.#spawnTable = spawnTable;
    this.#events = events;
  }

  get state() {
    return this.#state;
  }

  /** In the house: visible, lightable and dangerous. */
  get isPresent() {
    return PRESENT_GHOST_STATES.has(this.#state);
  }

  get isEnraged() {
    return this.#isEnraged;
  }

  reset(spawnPoint, dormantSeconds) {
    this.position.x = spawnPoint.x;
    this.position.z = spawnPoint.z;
    this.#state = GhostState.DORMANT;
    this.#stateCountdown = dormantSeconds;
    this.#exposure = 0;
    this.#outOfSightTime = 0;
    this.#isEnraged = false;
  }

  /** Takes the ghost out of play between rounds. */
  deactivate() {
    this.#state = GhostState.DORMANT;
    this.#stateCountdown = Infinity;
  }

  /** After the last candy: faster, never gives up, and comes back sooner if it's away. */
  enrage() {
    this.#isEnraged = true;
    if (this.#state === GhostState.DORMANT || this.#state === GhostState.BANISHED) {
      this.#stateCountdown = Math.min(this.#stateCountdown, this.#config.enragedRespawnDelay);
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
    if (!this.#countDown(seconds)) return;
    this.#appearAt(this.position, GhostState.WANDERING);
    this.#events.emit(GameEvent.GHOST_WOKE, { position: { ...this.position } });
  }

  #updateBanished(seconds, situation) {
    if (!this.#countDown(seconds)) return;
    const spot = this.#spawnTable.ghostSpotFarFrom(situation.playerPosition);
    this.#appearAt(spot, this.#isEnraged ? GhostState.HUNTING : GhostState.WANDERING);
    this.#events.emit(GameEvent.GHOST_RESPAWNED);
  }

  #updatePresent(seconds, situation) {
    if (this.#absorbLight(seconds, situation.isLit)) return;
    const distance = planarDistance(this.position, situation.playerPosition);
    if (this.#state === GhostState.WANDERING) this.#wander(seconds, situation, distance);
    if (this.#state === GhostState.HUNTING) this.#hunt(seconds, situation, distance);
    if (distance < this.#config.catchDistance) this.#events.emit(GameEvent.PLAYER_CAUGHT);
  }

  /** Returns true once the state countdown has run out. */
  #countDown(seconds) {
    this.#stateCountdown -= seconds;
    return this.#stateCountdown <= 0;
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
    this.#stateCountdown = this.#config.respawnDelay;
    this.#events.emit(GameEvent.GHOST_BANISHED, { position: { ...this.position } });
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
    this.#events.emit(GameEvent.GHOST_SPOTTED_PLAYER, { position: { ...this.position } });
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

  /** Moves straight at `target`. Returns how far is left to go. */
  #driftToward(target, speed, seconds) {
    const distance = planarDistance(this.position, target);
    if (distance < 1e-3) return 0;
    const isInsideWall = this.#tileMap.isBlocked(this.position.x, this.position.z);
    const step = Math.min(distance, speed * seconds * (isInsideWall ? this.#config.insideWallSpeedFactor : 1));
    this.heading = headingTo(this.position, target);
    this.position.x += ((target.x - this.position.x) / distance) * step;
    this.position.z += ((target.z - this.position.z) / distance) * step;
    return distance - step;
  }

  #canSee(point) {
    return this.#tileMap.hasLineOfSight(this.position, point);
  }

  #appearAt(spot, state) {
    this.position.x = spot.x;
    this.position.z = spot.z;
    this.#state = state;
    this.#exposure = 0;
    this.#outOfSightTime = 0;
    this.#wanderTarget = this.#spawnTable.randomGhostSpot();
  }
}
