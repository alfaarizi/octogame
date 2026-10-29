import { EventBus } from '../../core/EventBus.js';
import { Action, DEFAULT_KEY_BINDINGS, MOUSE_PRIMARY } from './keyBindings.js';

/** @typedef {import('../../types.js').MovementIntent} MovementIntent */
/** @typedef {import('../../types.js').PointerLock} PointerLock */

/** Turns raw keyboard and mouse events into game actions, a movement intent and mouse-look deltas. */
export class InputController {
  #bindings;
  #pointerLock;
  #heldCodes = new Set();
  #lookDelta = { x: 0, y: 0 };
  /** Emits each Action as an event when one of its keys is pressed. */
  #presses = new EventBus();

  /**
   * @param {object} options
   * @param {HTMLElement} options.surface - The canvas. Clicks on it count as MOUSE_PRIMARY while the pointer is locked.
   * @param {PointerLock} options.pointerLock - Mouse-look only counts while it's locked.
   * @param {Object<string, string[]>} [options.bindings] - Key codes for each Action. Defaults to DEFAULT_KEY_BINDINGS.
   * @param {Window} [options.eventTarget] - Where keyboard and mouse events are heard. Defaults to window.
   */
  constructor({ surface, pointerLock, bindings = DEFAULT_KEY_BINDINGS, eventTarget = window }) {
    this.#bindings = bindings;
    this.#pointerLock = pointerLock;
    eventTarget.addEventListener('keydown', (event) => this.#press(event.code, event.repeat));
    eventTarget.addEventListener('keyup', (event) => this.#heldCodes.delete(event.code));
    eventTarget.addEventListener('blur', () => this.clear());
    eventTarget.addEventListener('mousemove', (event) => this.#accumulateLook(event));
    surface.addEventListener('mousedown', (event) => {
      if (event.button === 0 && this.#pointerLock.isLocked) this.#announcePress(MOUSE_PRIMARY);
    });
  }

  isHeld(action) {
    return this.#bindings[action].some((code) => this.#heldCodes.has(code));
  }

  /** @returns {MovementIntent} */
  readMovementIntent() {
    return {
      forward: this.#axis(Action.MOVE_FORWARD, Action.MOVE_BACKWARD),
      strafe: this.#axis(Action.STRAFE_RIGHT, Action.STRAFE_LEFT),
      turn: this.#axis(Action.TURN_LEFT, Action.TURN_RIGHT),
      sprint: this.isHeld(Action.SPRINT),
    };
  }

  /** @returns {{ x: number, y: number }} Mouse movement since the last call, in pixels. */
  consumeLookDelta() {
    const delta = this.#lookDelta;
    this.#lookDelta = { x: 0, y: 0 };
    return delta;
  }

  /** Calls `listener` each time `action` is pressed (key repeat excluded). Returns an unsubscribe function. */
  onPressed(action, listener) {
    return this.#presses.on(action, listener);
  }

  /** Forgets held keys and pending mouse movement, e.g. on pause. */
  clear() {
    this.#heldCodes.clear();
    this.#lookDelta = { x: 0, y: 0 };
  }

  #press(code, isRepeat) {
    this.#heldCodes.add(code);
    if (!isRepeat) this.#announcePress(code);
  }

  #announcePress(code) {
    for (const [action, codes] of Object.entries(this.#bindings)) {
      if (codes.includes(code)) this.#presses.emit(action);
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
