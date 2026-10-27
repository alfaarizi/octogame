/** The front door: locked until all the candy is found, then reaching it ends the round. */
export class ExitDoor {
  #isUnlocked = false;
  #centerX;
  #trigger;

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

  isReachedBy(position) {
    return this.#isUnlocked && position.z > this.#trigger.minZ && Math.abs(position.x - this.#centerX) < this.#trigger.halfWidth;
  }
}
