import { ListenerSet } from '../../utils.js';

/** @typedef {import('../../types.js').PointerLock} PointerLock */

/**
 * Captures the mouse for mouse-look, using the browser's Pointer Lock API.
 * @implements {PointerLock}
 */
export class BrowserPointerLock {
  #element;
  #changeListeners = new ListenerSet();

  constructor(element) {
    this.#element = element;
    element.tabIndex = 0;
    const changed = () => this.#changeListeners.notify(this.isLocked);
    const failed = () => this.#changeListeners.notify(false);
    for (const name of ['pointerlockchange', 'webkitpointerlockchange']) document.addEventListener(name, changed);
    for (const name of ['pointerlockerror', 'webkitpointerlockerror']) document.addEventListener(name, failed);
  }

  get isLocked() {
    return document.pointerLockElement === this.#element || document.webkitPointerLockElement === this.#element;
  }

  request() {
    try {
      try { this.#element.focus({ preventScroll: true }); } catch { this.#element.focus(); }
      const request = this.#element.requestPointerLock ?? this.#element.webkitRequestPointerLock;
      // Browsers refuse a re-lock right after Esc; pointerlockerror handles it.
      request?.call(this.#element)?.catch?.(() => {});
    } catch {
      // Older browsers throw instead of rejecting; same outcome.
    }
  }

  release() {
    if (this.isLocked) (document.exitPointerLock ?? document.webkitExitPointerLock)?.call(document);
  }

  onChange(listener) {
    return this.#changeListeners.add(listener);
  }
}
