/** @typedef {import('../../types.js').FloorPoint} FloorPoint */

/**
 * Where the front door is: its center along the south wall, and the area just inside it that counts as reaching it.
 * @typedef {object} ExitDoorPlacement
 * @property {number} centerX
 * @property {{ minZ: number, halfWidth: number }} trigger
 */

/** The front door: locked until all the candy is found, then reaching it ends the round. */
export class ExitDoor {
  #isUnlocked = false;
  #centerX;
  #trigger;

  /** @param {ExitDoorPlacement} placement */
  constructor({ centerX, trigger }) {
    this.#centerX = centerX;
    this.#trigger = trigger;
  }

  get isUnlocked() {
    return this.#isUnlocked;
  }

  lock() {
    this.#isUnlocked = false;
  }

  unlock() {
    this.#isUnlocked = true;
  }

  /** @param {FloorPoint} position */
  isReachedBy(position) {
    return this.#isUnlocked && position.z > this.#trigger.minZ && Math.abs(position.x - this.#centerX) < this.#trigger.halfWidth;
  }
}
