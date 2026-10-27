import { ListenerSet } from '../utils.js';
import { Action, DEFAULT_KEY_BINDINGS, MOUSE_PRIMARY } from './keyBindings.js';

/** Turns raw keyboard and mouse events into game actions, a movement intent and mouse-look deltas. */
export class InputController {
  #bindings;
  #pointerLock;
  #pressedCodes = new Set();
  #lookDelta = { x: 0, y: 0 };
  #pressListenersByAction = new Map();

  /**
   * @param {object} options
   * @param {HTMLElement} options.surface - The canvas. Clicks on it count as MOUSE_PRIMARY while the pointer is locked.
   * @param {object} options.pointerLock - A BrowserPointerLock or SimulatedPointerLock. Mouse-look only counts while
   *   it's locked.
   * @param {Object<string, string[]>} [options.bindings] - Key codes for each Action. Defaults to DEFAULT_KEY_BINDINGS.
   * @param {EventTarget} [options.eventTarget] - Where keyboard and mouse events are heard. Defaults to window.
   */
  constructor({ surface, pointerLock, bindings = DEFAULT_KEY_BINDINGS, eventTarget = window }) {
    this.#bindings = bindings;
    this.#pointerLock = pointerLock;
    eventTarget.addEventListener('keydown', (event) => this.#press(event.code, event.repeat));
    eventTarget.addEventListener('keyup', (event) => this.#pressedCodes.delete(event.code));
    eventTarget.addEventListener('blur', () => this.clear());
    eventTarget.addEventListener('mousemove', (event) => this.#accumulateLook(event));
    surface.addEventListener('mousedown', (event) => {
      if (event.button === 0 && this.#pointerLock.isLocked) this.#notifyPressed(MOUSE_PRIMARY);
    });
  }

  isHeld(action) {
    return this.#bindings[action].some((code) => this.#pressedCodes.has(code));
  }

  /** @returns {{ forward: number, strafe: number, turn: number, sprint: boolean }} */
  readMovementIntent() {
    return {
      forward: this.#axis(Action.MOVE_FORWARD, Action.MOVE_BACKWARD),
      strafe: this.#axis(Action.STRAFE_RIGHT, Action.STRAFE_LEFT),
      turn: this.#axis(Action.TURN_LEFT, Action.TURN_RIGHT),
      sprint: this.isHeld(Action.SPRINT),
    };
  }

  /** Mouse movement since the last call, in pixels. */
  consumeLookDelta() {
    const delta = this.#lookDelta;
    this.#lookDelta = { x: 0, y: 0 };
    return delta;
  }

  /** Calls `listener` each time `action` is pressed (key repeat excluded). Returns an unsubscribe function. */
  onPressed(action, listener) {
    if (!this.#pressListenersByAction.has(action)) this.#pressListenersByAction.set(action, new ListenerSet());
    return this.#pressListenersByAction.get(action).add(listener);
  }

  /** Forgets held keys and pending mouse movement, e.g. on pause. */
  clear() {
    this.#pressedCodes.clear();
    this.#lookDelta = { x: 0, y: 0 };
  }

  #press(code, isRepeat) {
    this.#pressedCodes.add(code);
    if (!isRepeat) this.#notifyPressed(code);
  }

  #notifyPressed(code) {
    for (const [action, listeners] of this.#pressListenersByAction) {
      if (this.#bindings[action].includes(code)) listeners.notify();
    }
  }

  #accumulateLook(event) {
    if (!this.#pointerLock.isLocked) return;
    this.#lookDelta.x += event.movementX;
    this.#lookDelta.y += event.movementY;
  }

  #axis(positive, negative) {
    return (this.isHeld(positive) ? 1 : 0) - (this.isHeld(negative) ? 1 : 0);
  }
}
