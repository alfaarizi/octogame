import { ListenerSet } from '../utils.js';

/**
 * Captures the mouse for mouse-look, using the browser's Pointer Lock API.
 * Shares its shape with SimulatedPointerLock: isLocked, request(), release(), onChange(listener) → unsubscribe.
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
