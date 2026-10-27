import { planarDistance } from '../../utils.js';

/** @typedef {import('../../types.js').Point3} Point3 */

export const PickupKind = Object.freeze({ CANDY: 'candy', BATTERY: 'battery' });

/**
 * A candy or battery lying in the office. Its id lets views keep track of its mesh.
 * @typedef {object} Pickup
 * @property {number} id
 * @property {string} kind - A PickupKind value.
 * @property {Point3} position
 */

/**
 * @typedef {object} NearestPickup
 * @property {Pickup} item
 * @property {number} distance
 */

const NO_PICKUPS = Object.freeze([]);

/** The candies and batteries lying around this round. */
export class PickupField {
  /** @type {readonly Pickup[]} */
  #items = NO_PICKUPS;
  #nextId = 1;
  #pickupRadius;
  #reachHeight;

  /**
   * @param {object} reach
   * @param {number} reach.pickupRadius - How far away, across the floor, the player can pick things up.
   * @param {number} reach.reachHeight - How far above or below their feet; less than a storey.
   */
  constructor({ pickupRadius, reachHeight }) {
    this.#pickupRadius = pickupRadius;
    this.#reachHeight = reachHeight;
  }

  /** The items in the field. Never changed in place: any change replaces the whole array. */
  get items() {
    return this.#items;
  }

  /** @param {{ candySpots: Point3[], batterySpots: Point3[] }} spots */
  populate({ candySpots, batterySpots }) {
    this.#items = Object.freeze([
      ...candySpots.map((spot) => this.#createItem(PickupKind.CANDY, spot)),
      ...batterySpots.map((spot) => this.#createItem(PickupKind.BATTERY, spot)),
    ]);
  }

  clear() {
    this.#items = NO_PICKUPS;
  }

  /**
   * Removes and returns every item within reach of someone standing at `position`.
   * @param {Point3} position
   * @returns {Pickup[]}
   */
  collectWithinReach(position) {
    const reached = this.#items.filter(
      (item) => this.#isLevelWith(item, position) && planarDistance(item.position, position) < this.#pickupRadius,
    );
    if (reached.length > 0) this.#items = Object.freeze(this.#items.filter((item) => !reached.includes(item)));
    return reached;
  }

  /**
   * @param {string} kind - A PickupKind value.
   * @param {Point3} position - Where someone stands.
   * @returns {NearestPickup | null} The closest item of `kind` on their floor, or null if there are none.
   */
  nearest(kind, position) {
    let closest = null;
    for (const item of this.#items) {
      if (item.kind !== kind || !this.#isLevelWith(item, position)) continue;
      const distance = planarDistance(item.position, position);
      if (!closest || distance < closest.distance) closest = { item, distance };
    }
    return closest;
  }

  /** Whether `item` is within reach above or below someone standing at `position`. */
  #isLevelWith(item, position) {
    return Math.abs(item.position.y - position.y) < this.#reachHeight;
  }

  /** @returns {Pickup} */
  #createItem(kind, { x, y, z }) {
    return Object.freeze({ id: this.#nextId++, kind, position: Object.freeze({ x, y, z }) });
  }
}
