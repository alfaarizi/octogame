import { EventBus } from '../../core/EventBus.js';
import { Action, DEFAULT_KEY_BINDINGS, MOUSE_PRIMARY } from './keyBindings.js';

/** @typedef {import('../../types.js').MovementIntent} MovementIntent */
/** @typedef {import('../../types.js').PointerLock} PointerLock */

/** Turns raw keyboard and mouse events into game actions, a movement intent and mouse-look deltas. */
export class InputController {
  #bindings;
  #pointerLock;
  #gameCodes;
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
    this.#gameCodes = new Set(Object.values(bindings).flat());
    // Capture phase, so the keys land here even when another page script or a
    // browser extension handles the event first and stops its propagation.
    eventTarget.addEventListener('keydown', (event) => this.#onKeyDown(event), true);
    eventTarget.addEventListener('keyup', (event) => this.#heldCodes.delete(normalizeKeyCode(event)), true);
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

  #onKeyDown(event) {
    const code = normalizeKeyCode(event);
    if (!code) return;
    if (this.#pointerLock.isLocked && this.#gameCodes.has(code) && event.cancelable) event.preventDefault();
    const wasHeld = this.#heldCodes.has(code);
    this.#heldCodes.add(code);
    if (!wasHeld && !event.repeat) this.#announcePress(code);
  }

  #announcePress(code) {
    for (const [action, codes] of Object.entries(this.#bindings)) {
      if (codes.includes(code)) this.#presses.emit(action);
    }
  }

  #accumulateLook(event) {
    if (!this.#pointerLock.isLocked) return;
    this.#lookDelta.x += event.movementX ?? event.webkitMovementX ?? 0;
    this.#lookDelta.y += event.movementY ?? event.webkitMovementY ?? 0;
  }

  #axis(positive, negative) {
    return (this.isHeld(positive) ? 1 : 0) - (this.isHeld(negative) ? 1 : 0);
  }
}

/** KeyboardEvent.code is absent or Unidentified on some browser and keyboard combinations. */
function normalizeKeyCode({ code, key, keyCode }) {
  if (code?.startsWith('Numpad') && /^[12]$/.test(code.slice(-1))) return `Digit${code.slice(-1)}`;
  if (code && code !== 'Unidentified') return code;
  if (/^[a-z]$/i.test(key ?? '')) return `Key${key.toUpperCase()}`;
  if (/^[12]$/.test(key ?? '')) return `Digit${key}`;
  if (key === 'Shift') return 'ShiftLeft';
  if (key?.startsWith('Arrow')) return key;
  if (key === 'Escape') return 'Escape';
  // Old WebKit calls the space bar's key value "Spacebar".
  if (key === ' ' || key === 'Spacebar') return 'Space';
  return keyCodeToCode(keyCode);
}

/**
 * Last-resort legacy `keyCode`, for browsers (or extension-mangled Chromium input)
 * that report neither a usable `code` nor a usable `key`.
 */
function keyCodeToCode(keyCode) {
  if (!keyCode) return null;
  if (keyCode >= 65 && keyCode <= 90) return `Key${String.fromCharCode(keyCode)}`;
  if (keyCode >= 48 && keyCode <= 57) return `Digit${keyCode - 48}`;
  return UNCODED_KEY_CODES.get(keyCode) ?? null;
}

/** Legacy keyCodes of the keys this game actually uses. */
const UNCODED_KEY_CODES = new Map([
  [16, 'ShiftLeft'],
  [32, 'Space'],
  [27, 'Escape'],
  [37, 'ArrowLeft'],
  [38, 'ArrowUp'],
  [39, 'ArrowRight'],
  [40, 'ArrowDown'],
]);
