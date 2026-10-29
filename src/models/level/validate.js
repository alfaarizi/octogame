/**
 * @file Checks for the level's JSON files. Each takes the value and where it came from (such as
 * `ground-floor.json furniture.lobby[2]`) and either returns the value, converted where noted, or throws a
 * LevelFormatError naming that place, so a typo in a data file is easy to find.
 */

import { Compass } from '../../utils.js';

/** @typedef {import('../../types.js').FloorPoint} FloorPoint */
/** @typedef {import('../../types.js').Point3} Point3 */
/** @typedef {import('../../types.js').Rect} Rect */
/** @typedef {import('../../types.js').Box} Box */

export class LevelFormatError extends Error {
  /**
   * @param {string} path - Where in the level files the problem is.
   * @param {string} problem
   */
  constructor(path, problem) {
    super(`${path}: ${problem}`);
    this.name = 'LevelFormatError';
  }
}

const COMPASS_BY_NAME = Object.freeze({ north: Compass.NORTH, south: Compass.SOUTH, east: Compass.EAST, west: Compass.WEST });
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const describe = (value) => (value === undefined ? 'nothing' : JSON.stringify(value));

/** @returns {number} */
export function number(value, path) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new LevelFormatError(path, `expected a number, found ${describe(value)}`);
  return value;
}

/** @returns {number} */
export function positiveNumber(value, path) {
  if (number(value, path) <= 0) throw new LevelFormatError(path, `expected a number above 0, found ${value}`);
  return value;
}

/** @returns {number} */
export function integer(value, path) {
  if (!Number.isInteger(value)) throw new LevelFormatError(path, `expected a whole number, found ${describe(value)}`);
  return value;
}

/** @returns {string} */
export function text(value, path) {
  if (typeof value !== 'string' || value.length === 0) throw new LevelFormatError(path, `expected some text, found ${describe(value)}`);
  return value;
}

/** @returns {boolean} */
export function boolean(value, path) {
  if (typeof value !== 'boolean') throw new LevelFormatError(path, `expected true or false, found ${describe(value)}`);
  return value;
}

/** @returns {Record<string, unknown>} */
export function object(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new LevelFormatError(path, `expected an object, found ${describe(value)}`);
  return value;
}

/**
 * @template T
 * @param {unknown} value
 * @param {string} path
 * @param {(item: unknown, path: string) => T} readItem
 * @returns {T[]}
 */
export function list(value, path, readItem) {
  if (!Array.isArray(value)) throw new LevelFormatError(path, `expected a list, found ${describe(value)}`);
  return value.map((item, index) => readItem(item, `${path}[${index}]`));
}

/**
 * @param {unknown} value
 * @param {string} path
 * @param {number} length
 * @param {string} shape - How the numbers are laid out, for the error message.
 * @returns {number[]}
 */
function numbers(value, path, length, shape) {
  if (!Array.isArray(value) || value.length !== length || !value.every((item) => typeof item === 'number' && Number.isFinite(item))) {
    throw new LevelFormatError(path, `expected ${shape}, found ${describe(value)}`);
  }
  return value;
}

/**
 * @returns {Rect} From `[x0, z0, x1, z1]`, the corners of a rectangle on the floor plan.
 */
export function rect(value, path) {
  const [x0, z0, x1, z1] = numbers(value, path, 4, '[x0, z0, x1, z1]');
  if (x0 >= x1 || z0 >= z1) throw new LevelFormatError(path, `x0 and z0 must be less than x1 and z1, found ${describe(value)}`);
  return { x0, z0, x1, z1 };
}

/**
 * @returns {Box} From `[x0, z0, x1, z1, y0, y1]`: a rectangle on the floor plan, and the heights it spans.
 */
export function box(value, path) {
  const [x0, z0, x1, z1, y0, y1] = numbers(value, path, 6, '[x0, z0, x1, z1, y0, y1]');
  if (x0 >= x1 || z0 >= z1 || y0 >= y1) throw new LevelFormatError(path, `each lower bound must be less than its upper bound, found ${describe(value)}`);
  return { x0, z0, x1, z1, y0, y1 };
}

/** @returns {FloorPoint} From `{ "x": ..., "z": ... }`. */
export function floorPoint(value, path) {
  const point = object(value, path);
  return { x: number(point.x, `${path}.x`), z: number(point.z, `${path}.z`) };
}

/** @returns {Point3} From `{ "x": ..., "y": ..., "z": ... }`. */
export function point3(value, path) {
  const point = object(value, path);
  return { x: number(point.x, `${path}.x`), y: number(point.y, `${path}.y`), z: number(point.z, `${path}.z`) };
}

/** @returns {FloorPoint} A Compass direction, from "north", "south", "east" or "west". */
export function compass(value, path) {
  const direction = COMPASS_BY_NAME[/** @type {string} */ (value)];
  if (!direction) throw new LevelFormatError(path, `expected "north", "south", "east" or "west", found ${describe(value)}`);
  return direction;
}

/** @returns {number} From "#rrggbb". */
export function hexColor(value, path) {
  if (typeof value !== 'string' || !HEX_COLOR.test(value)) throw new LevelFormatError(path, `expected a color like "#3dffb0", found ${describe(value)}`);
  return Number.parseInt(value.slice(1), 16);
}
