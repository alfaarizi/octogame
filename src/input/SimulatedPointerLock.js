import { ListenerSet } from '../utils.js';

/**
 * Stand-in for BrowserPointerLock in automated browser tests, where real pointer lock is refused.
 * Requests are granted at once, and release() plays the part of the player pressing Esc.
 */
export class SimulatedPointerLock {
  #isLocked = false;
  #changeListeners = new ListenerSet();

  get isLocked() {
    return this.#isLocked;
  }

  request() {
    this.#setLocked(true);
  }

  release() {
    this.#setLocked(false);
  }

  onChange(listener) {
    return this.#changeListeners.add(listener);
  }

  #setLocked(isLocked) {
    if (isLocked === this.#isLocked) return;
    this.#isLocked = isLocked;
    this.#changeListeners.notify(isLocked);
  }
}
