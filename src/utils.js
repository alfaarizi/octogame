/**
 * @file General-purpose helpers shared across the game. Nothing here knows about the game itself,
 * the page, Three.js or Web Audio, so all of it also runs in the Node unit tests.
 */

/** @typedef {import('./types.js').Cone} Cone */
/** @typedef {import('./types.js').FloorPoint} FloorPoint */
/** @typedef {import('./types.js').Point3} Point3 */
/** @typedef {import('./types.js').Range} Range */
/** @typedef {import('./types.js').Ray} Ray */

// ---- Math ----

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const clamp01 = (value) => clamp(value, 0, 1);

export const degreesToRadians = (degrees) => (degrees * Math.PI) / 180;

/** Moves `current` toward `target` by `fraction` of the gap, never past it. */
export const easeToward = (current, target, fraction) => current + (target - current) * Math.min(1, fraction);

/** Maps any angle into the range (-Math.PI, Math.PI]. */
export const wrapAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** Turns `current` toward `target` the short way round, by `fraction` (0 to 1) of the gap. */
export const rotateToward = (current, target, fraction) => current + wrapAngle(target - current) * Math.min(1, fraction);

// ---- Geometry ----

/**
 * @param {FloorPoint} a
 * @param {FloorPoint} b
 * @returns {number} The distance between the points, ignoring height.
 */
export const planarDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/**
 * @param {FloorPoint} from
 * @param {FloorPoint} to
 * @returns {number} The heading from one point to the other, in radians, where 0 faces +z.
 */
export const headingTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

/**
 * @param {FloorPoint} origin
 * @param {number} heading - Radians, where 0 faces +z.
 * @param {number} distance
 * @returns {FloorPoint} The point `distance` away from `origin` along `heading`.
 */
export const pointAlongHeading = (origin, heading, distance) => ({
  x: origin.x + Math.sin(heading) * distance,
  z: origin.z + Math.cos(heading) * distance,
});

/**
 * @param {FloorPoint} point
 * @param {number} y
 * @returns {Point3} The floor point raised to height `y`.
 */
export const atHeight = ({ x, z }, y) => ({ x, y, z });

/** Closer than this, a target's width stops widening the cone any further. */
const MIN_WIDTH_DISTANCE = 0.1;

/**
 * Whether `target` lies inside `cone` around `ray`. `targetRadius` widens the cone for big targets,
 * which matters most up close.
 * @param {Ray} ray
 * @param {Cone} cone
 * @param {Point3} target
 * @param {number} [targetRadius]
 * @returns {boolean}
 */
export function isWithinCone({ origin, direction }, { halfAngle, range }, target, targetRadius = 0) {
  const tx = target.x - origin.x, ty = target.y - origin.y, tz = target.z - origin.z;
  const distance = Math.hypot(tx, ty, tz);
  if (distance > range) return false;
  if (distance < 1e-6) return true;
  const directionLength = Math.hypot(direction.x, direction.y, direction.z);
  const cosine = (tx * direction.x + ty * direction.y + tz * direction.z) / (distance * directionLength);
  const angle = Math.acos(clamp(cosine, -1, 1));
  return angle <= halfAngle + Math.atan(targetRadius / Math.max(distance, MIN_WIDTH_DISTANCE));
}

// ---- Randomness ----
// Where a `random` argument is accepted, pass a function returning values in [0, 1) to make results predictable in tests.

/** @param {Range} range */
export const randomInRange = ({ min, max }, random = Math.random) => min + random() * (max - min);

/** A random value in [-amount, amount]. */
export const randomSpread = (amount) => (Math.random() * 2 - 1) * amount;

export const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

export const chance = (probability) => Math.random() < probability;

/**
 * @template T
 * @param {readonly { value: T, weight: number }[]} options
 * @returns {T} One option's `value`, picked with probability proportional to its `weight`.
 */
export function weightedRandomItem(options) {
  let roll = Math.random() * options.reduce((total, option) => total + option.weight, 0);
  for (const option of options) {
    roll -= option.weight;
    if (roll < 0) return option.value;
  }
  return options[options.length - 1].value;
}

/** A shuffled copy of `items` (Fisher-Yates). */
export function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * `steps` values that wander from `start` by up to `maxStep / 2` either way each step, kept within [min, max].
 * A positive `upwardBias` (0 to 0.5) makes the walk tend to rise.
 */
export function randomWalk({ steps, start, min, max, maxStep, upwardBias = 0 }) {
  const values = new Float32Array(steps);
  let value = start;
  for (let i = 0; i < steps; i++) {
    value = clamp(value + (Math.random() - 0.5 + upwardBias) * maxStep, min, max);
    values[i] = value;
  }
  return values;
}

// ---- Objects ----

/** Freezes an object and everything nested inside it, so shared data can't be changed by accident. */
export function deepFreeze(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) deepFreeze(child);
  }
  return Object.freeze(value);
}

// ---- Formatting ----

/** Formats a round time as m:ss.s, e.g. 2:07.4. */
export function formatRoundTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
}

// ---- Timing ----

/** Counts seconds down to zero, for anything that waits or repeats: footsteps, a heartbeat, a respawn. */
export class Countdown {
  #remaining;

  constructor(seconds = 0) {
    this.#remaining = seconds;
  }

  /** Seconds left; zero or less once it has run out. */
  get remaining() {
    return this.#remaining;
  }

  /** Advances the countdown and reports whether it has run out. Call restart() after acting on it. */
  tick(seconds) {
    this.#remaining -= seconds;
    return this.#remaining <= 0;
  }

  restart(seconds) {
    this.#remaining = seconds;
  }
}

// ---- Callbacks ----

/** A set of callbacks that are called together. Every subscription in the game is built on this. */
export class ListenerSet {
  #listeners = new Set();

  /** Adds `listener`. Returns a function that removes it again. */
  add(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** Calls every listener with `args`. A listener may remove itself while being called. */
  notify(...args) {
    for (const listener of [...this.#listeners]) listener(...args);
  }
}
