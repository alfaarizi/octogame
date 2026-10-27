import { planarDistance } from '../../utils.js';

/** @typedef {import('../../types.js').FloorPoint} FloorPoint */
/** @typedef {import('../../types.js').Point3} Point3 */

export const PickupKind = Object.freeze({ CANDY: 'candy', BATTERY: 'battery' });

/**
 * A candy or battery lying in the house. Its id lets views keep track of its mesh.
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

  constructor(pickupRadius) {
    this.#pickupRadius = pickupRadius;
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
   * Removes and returns every item within reach of `position`.
   * @param {FloorPoint} position
   * @returns {Pickup[]}
   */
  collectWithinReach(position) {
    const reached = this.#items.filter((item) => planarDistance(item.position, position) < this.#pickupRadius);
    if (reached.length > 0) this.#items = Object.freeze(this.#items.filter((item) => !reached.includes(item)));
    return reached;
  }

  /**
   * @param {string} kind - A PickupKind value.
   * @param {FloorPoint} position
   * @returns {NearestPickup | null} The closest item of `kind`, or null if there are none.
   */
  nearest(kind, position) {
    let closest = null;
    for (const item of this.#items) {
      if (item.kind !== kind) continue;
      const distance = planarDistance(item.position, position);
      if (!closest || distance < closest.distance) closest = { item, distance };
    }
    return closest;
  }

  /** @returns {Pickup} */
  #createItem(kind, { x, y, z }) {
    return Object.freeze({ id: this.#nextId++, kind, position: Object.freeze({ x, y, z }) });
  }
}
