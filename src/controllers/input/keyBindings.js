export const Action = Object.freeze({
  MOVE_FORWARD: 'move-forward',
  MOVE_BACKWARD: 'move-backward',
  STRAFE_LEFT: 'strafe-left',
  STRAFE_RIGHT: 'strafe-right',
  TURN_LEFT: 'turn-left',
  TURN_RIGHT: 'turn-right',
  SPRINT: 'sprint',
  TOGGLE_FLASHLIGHT: 'toggle-flashlight',
  USE_ITEM: 'use-item',
  INTERACT: 'interact',
  DROP_ITEM: 'drop-item',
  SLOT_ONE: 'slot-one',
  SLOT_TWO: 'slot-two',
  JOURNAL: 'journal',
});

/** The primary mouse button, bindable like a key. */
export const MOUSE_PRIMARY = 'MousePrimary';

/** Maps each Action to the KeyboardEvent.code values (plus MOUSE_PRIMARY) that trigger it. */
export const DEFAULT_KEY_BINDINGS = Object.freeze({
  [Action.MOVE_FORWARD]: ['KeyW', 'ArrowUp'],
  [Action.MOVE_BACKWARD]: ['KeyS', 'ArrowDown'],
  [Action.STRAFE_LEFT]: ['KeyA'],
  [Action.STRAFE_RIGHT]: ['KeyD'],
  [Action.TURN_LEFT]: ['ArrowLeft'],
  [Action.TURN_RIGHT]: ['ArrowRight'],
  [Action.SPRINT]: ['ShiftLeft', 'ShiftRight'],
  [Action.TOGGLE_FLASHLIGHT]: ['KeyF'],
  [Action.USE_ITEM]: [MOUSE_PRIMARY],
  [Action.INTERACT]: ['KeyE'],
  [Action.DROP_ITEM]: ['KeyQ'],
  [Action.SLOT_ONE]: ['Digit1'],
  [Action.SLOT_TWO]: ['Digit2'],
  [Action.JOURNAL]: ['KeyJ'],
});
