import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InputController } from '../src/controllers/input/InputController.js';
import { Action } from '../src/controllers/input/keyBindings.js';
import { BrowserPointerLock } from '../src/controllers/input/BrowserPointerLock.js';

class EventSource {
  #listeners = new Map();

  addEventListener(name, listener) {
    const listeners = this.#listeners.get(name) ?? [];
    listeners.push(listener);
    this.#listeners.set(name, listeners);
  }

  emit(name, properties = {}) {
    const event = {
      cancelable: true,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      ...properties,
    };
    for (const listener of this.#listeners.get(name) ?? []) listener(event);
    return event;
  }
}

test('keyboard fallbacks, numpad slots, repeats and blur behave consistently while locked', () => {
  const windowEvents = new EventSource();
  const canvas = new EventSource();
  const input = new InputController({ surface: canvas, pointerLock: { isLocked: true }, eventTarget: windowEvents });
  let interactions = 0;
  let slotSelections = 0;
  input.onPressed(Action.INTERACT, () => interactions++);
  input.onPressed(Action.SLOT_ONE, () => slotSelections++);

  const first = windowEvents.emit('keydown', { code: 'Unidentified', key: 'e', repeat: false });
  assert.equal(first.defaultPrevented, true);
  windowEvents.emit('keydown', { code: 'Unidentified', key: 'e', repeat: true });
  assert.equal(interactions, 1);
  windowEvents.emit('keyup', { code: 'Unidentified', key: 'e' });
  windowEvents.emit('keydown', { code: '', key: 'E', repeat: false });
  assert.equal(interactions, 2);

  windowEvents.emit('keydown', { code: 'Numpad1', key: '1', repeat: false });
  assert.equal(slotSelections, 1);
  windowEvents.emit('keydown', { code: 'Unidentified', key: 'w', repeat: false });
  assert.equal(input.readMovementIntent().forward, 1);
  windowEvents.emit('mousemove', { webkitMovementX: 7, webkitMovementY: -3 });
  assert.deepEqual(input.consumeLookDelta(), { x: 7, y: -3 });
  windowEvents.emit('blur');
  assert.equal(input.readMovementIntent().forward, 0);
});

test('prefixed pointer lock events and methods keep older WebKit input active', () => {
  const previousDocument = globalThis.document;
  const browserDocument = new EventSource();
  const canvas = {
    tabIndex: -1,
    focus() { this.focused = true; },
    webkitRequestPointerLock() {
      browserDocument.webkitPointerLockElement = canvas;
      browserDocument.emit('webkitpointerlockchange');
    },
  };
  browserDocument.webkitExitPointerLock = () => {
    browserDocument.webkitPointerLockElement = null;
    browserDocument.emit('webkitpointerlockchange');
  };
  globalThis.document = browserDocument;
  try {
    const pointerLock = new BrowserPointerLock(canvas);
    const states = [];
    pointerLock.onChange((locked) => states.push(locked));
    pointerLock.request();
    assert.equal(canvas.focused, true);
    assert.equal(pointerLock.isLocked, true);
    pointerLock.release();
    assert.deepEqual(states, [true, false]);
  } finally {
    globalThis.document = previousDocument;
  }
});

test('pointer lock focuses its keyboard target, so key-grabbing extensions pass keys on', () => {
  const previousDocument = globalThis.document;
  globalThis.document = new EventSource();
  try {
    const canvas = { focus() { this.focused = true; }, requestPointerLock() {} };
    const stage = { tabIndex: -1, focus() { this.focused = true; } };
    new BrowserPointerLock(canvas, stage).request();
    assert.equal(stage.focused, true);
    assert.equal(canvas.focused, undefined);
  } finally {
    globalThis.document = previousDocument;
  }
});
