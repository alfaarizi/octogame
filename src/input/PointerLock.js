import { ListenerSet } from '../core/ListenerSet.js';

/**
 * Captures the mouse for mouse-look. Both classes here share one shape:
 * isLocked, request(), release(), onChange(listener) → unsubscribe.
 */
export class BrowserPointerLock {
  #element;
  #changeListeners = new ListenerSet();

  constructor(element) {
    this.#element = element;
    document.addEventListener('pointerlockchange', () => this.#changeListeners.notify(this.isLocked));
    document.addEventListener('pointerlockerror', () => this.#changeListeners.notify(false));
  }

  get isLocked() {
    return document.pointerLockElement === this.#element;
  }

  request() {
    try {
      // Browsers refuse a re-lock right after Esc; that lands in pointerlockerror, so the rejection is ignored here.
      this.#element.requestPointerLock()?.catch?.(() => {});
    } catch {
      // Older browsers throw instead of rejecting; same outcome.
    }
  }

  release() {
    if (this.isLocked) document.exitPointerLock();
  }

  onChange(listener) {
    return this.#changeListeners.add(listener);
  }
}

/**
 * Stand-in for automated browser tests, where real pointer lock is refused: requests are granted at once,
 * and release() plays the part of the player pressing Esc.
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
