import { clamp } from '../core/math.js';

export const STANDING_STILL = Object.freeze({ moving: false, sprinting: false });

/**
 * The player's body: where they stand, where they look, and how much sprint is left.
 * Yaw 0 looks down -z; positive yaw turns left.
 */
export class Player {
  position = { x: 0, z: 0 };
  yaw = 0;
  pitch = 0;
  #config;
  #collisionWorld;
  #stamina = 1;
  #isWinded = false;
  #movement = STANDING_STILL;

  constructor(config, collisionWorld) {
    this.#config = config;
    this.#collisionWorld = collisionWorld;
  }

  /** 0–1 */
  get stamina() {
    return this.#stamina;
  }

  get movement() {
    return this.#movement;
  }

  respawn({ x, z, yaw }) {
    this.position.x = x;
    this.position.z = z;
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
   * @param {{ forward: number, strafe: number, turn: number, sprint: boolean }} intent
   *   forward/strafe/turn are -1, 0 or 1 (strafe +1 = right, turn +1 = left).
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
    const length = Math.hypot(dx, dz);
    this.position.x += (dx / length) * speed * seconds;
    this.position.z += (dz / length) * speed * seconds;
    this.#collisionWorld.resolveCircle(this.position, this.#config.collisionRadius);
  }
}
