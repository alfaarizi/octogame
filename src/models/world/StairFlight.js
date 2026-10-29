import { clamp01, edgeStrip } from '../../utils.js';

/** @typedef {import('../../types.js').FloorPoint} FloorPoint */
/** @typedef {import('../../types.js').Rect} Rect */

/** How thick the parapet along a flight's open side is. */
export const RAIL_THICKNESS = 0.1;

/**
 * Where a flight of stairs lies and how it climbs. Heights are measured from the ground floor.
 * @typedef {object} StairFlightPlan
 * @property {Rect} rect
 * @property {FloorPoint | null} rises - The Compass direction you walk to go up it, or null for a landing.
 * @property {number} low - Height at its foot.
 * @property {number} high - Height at its head.
 * @property {readonly FloorPoint[]} rails - Compass directions of its sides with a balustrade.
 */

/** A straight flight of stairs, or a flat landing. Bodies glide along its slope; the steps are only drawn. */
export class StairFlight {
  /** @readonly @type {Rect} */
  rect;
  /** @readonly @type {Rect[]} The balustrades along its open sides. */
  rails;
  #rises;
  #low;
  #high;

  /** @param {StairFlightPlan} plan */
  constructor({ rect, rises, low, high, rails }) {
    this.rect = rect;
    this.rails = rails.map((side) => edgeStrip(rect, side, RAIL_THICKNESS));
    this.#rises = rises;
    this.#low = low;
    this.#high = high;
  }

  /** @param {FloorPoint} point */
  contains({ x, z }) {
    const { x0, z0, x1, z1 } = this.rect;
    return x >= x0 && x < x1 && z >= z0 && z < z1;
  }

  /**
   * @param {FloorPoint} point - May lie beyond the flight's ends or sides.
   * @returns {number} The height of the slope level with `point`.
   */
  heightAt({ x, z }) {
    if (!this.#rises) return this.#low;
    const { x0, z0, x1, z1 } = this.rect, { x: eastward, z: southward } = this.#rises;
    const run = Math.abs(eastward) * (x1 - x0) + Math.abs(southward) * (z1 - z0);
    const climbed = (x - (x0 + x1) / 2) * eastward + (z - (z0 + z1) / 2) * southward;
    return this.#low + (this.#high - this.#low) * clamp01(climbed / run + 0.5);
  }
}
