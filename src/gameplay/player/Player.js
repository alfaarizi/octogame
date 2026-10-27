import { above, clamp } from '../../utils.js';

/** @typedef {import('../../types.js').Movement} Movement */
/** @typedef {import('../../types.js').MovementIntent} MovementIntent */
/** @typedef {import('../../types.js').Point3} Point3 */
/** @typedef {import('../../types.js').Ray} Ray */
/** @typedef {import('../../types.js').SpawnPoint} SpawnPoint */

/** @type {Movement} */
export const STANDING_STILL = Object.freeze({ moving: false, sprinting: false });

/**
 * The player's body: where they stand, where they look, and how much sprint is left.
 * Satisfies the Pose type; yaw 0 looks down -z and positive yaw turns left.
 */
export class Player {
  /** @type {Point3} Where the player's feet are. */
  position = { x: 0, y: 0, z: 0 };
  yaw = 0;
  pitch = 0;
  #config;
  #building;
  #stamina = 1;
  #isWinded = false;
  /** @type {Movement} */
  #movement = STANDING_STILL;

  /**
   * @param {typeof import('../../config/gameConfig.js').GAME_CONFIG['player']} config
   * @param {Pick<import('../../world/Building.js').Building, 'move'>} building - What the player walks around.
   */
  constructor(config, building) {
    this.#config = config;
    this.#building = building;
  }

  /** Sprint stamina left, from 0 to 1. */
  get stamina() {
    return this.#stamina;
  }

  /** How the player moved in the last update. */
  get movement() {
    return this.#movement;
  }

  /** @returns {Ray} The player's line of sight, from eye height along the view direction. */
  get sight() {
    const horizontal = Math.cos(this.pitch);
    return {
      origin: above(this.position, this.#config.eyeHeight),
      direction: { x: -Math.sin(this.yaw) * horizontal, y: Math.sin(this.pitch), z: -Math.cos(this.yaw) * horizontal },
    };
  }

  /** @param {SpawnPoint} spawn */
  respawn({ x, y, z, yaw }) {
    Object.assign(this.position, { x, y, z });
    this.yaw = yaw;
    this.pitch = 0;
    this.#stamina = 1;
    this.#isWinded = false;
    this.#movement = STANDING_STILL;
  }

  /** Mouse-look, in pixels moved. */
  look(deltaX, deltaY) {
    const { mouseSensitivity, maxPitch } = this.#config;
    this.yaw -= deltaX * mouseSensitivity;
    this.pitch = clamp(this.pitch - deltaY * mouseSensitivity, -maxPitch, maxPitch);
  }

  /**
   * @param {number} seconds - Time since the last frame.
   * @param {MovementIntent} intent
   * @returns {Movement}
   */
  update(seconds, intent) {
    this.yaw += intent.turn * this.#config.keyboardTurnSpeed * seconds;
    const moving = intent.forward !== 0 || intent.strafe !== 0;
    const sprinting = this.#updateStamina(seconds, moving && intent.sprint);
    if (moving) this.#walk(seconds, intent, sprinting);
    this.#movement = moving ? { moving, sprinting } : STANDING_STILL;
    return this.#movement;
  }

  /** Spends stamina while sprinting; at zero you're winded until it refills a bit. Returns whether sprinting. */
  #updateStamina(seconds, wantsToSprint) {
    const { sprintDuration, sprintRecharge, windedRecoveryLevel } = this.#config;
    const sprinting = wantsToSprint && !this.#isWinded;
    if (sprinting) {
      this.#stamina = Math.max(0, this.#stamina - seconds / sprintDuration);
      if (this.#stamina === 0) this.#isWinded = true;
    } else {
      this.#stamina = Math.min(1, this.#stamina + seconds / sprintRecharge);
      if (this.#isWinded && this.#stamina > windedRecoveryLevel) this.#isWinded = false;
    }
    return sprinting;
  }

  #walk(seconds, { forward, strafe }, sprinting) {
    const speed = sprinting ? this.#config.sprintSpeed : this.#config.walkSpeed;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const dx = -sin * forward + cos * strafe;
    const dz = -cos * forward - sin * strafe;
    const scale = (speed * seconds) / Math.hypot(dx, dz);
    this.#building.move(this.position, dx * scale, dz * scale, this.#config.collisionRadius);
  }
}
