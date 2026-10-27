import { planarDistance } from '../../utils.js';

export const PickupKind = Object.freeze({ CANDY: 'candy', BATTERY: 'battery' });

/**
 * The candies and batteries lying around this round.
 * Each item is { id, kind, position: { x, y, z } }; ids let views keep track of their meshes.
 */
export class PickupField {
  #items = [];
  #nextId = 1;
  #pickupRadius;

  constructor(pickupRadius) {
    this.#pickupRadius = pickupRadius;
  }

  get items() {
    return this.#items;
  }

  populate({ candySpots, batterySpots }) {
    this.clear();
    for (const spot of candySpots) this.#add(PickupKind.CANDY, spot);
    for (const spot of batterySpots) this.#add(PickupKind.BATTERY, spot);
  }

  clear() {
    this.#items = [];
  }

  /** Removes and returns every item within reach of `position`. */
  collectWithinReach(position) {
    const reached = this.#items.filter((item) => planarDistance(item.position, position) < this.#pickupRadius);
    if (reached.length > 0) this.#items = this.#items.filter((item) => !reached.includes(item));
    return reached;
  }

  /** The closest item of `kind`, as { item, distance }, or null if there are none. */
  nearest(kind, position) {
    let closest = null;
    for (const item of this.#items) {
      if (item.kind !== kind) continue;
      const distance = planarDistance(item.position, position);
      if (!closest || distance < closest.distance) closest = { item, distance };
    }
    return closest;
  }

  #add(kind, { x, y, z }) {
    this.#items.push(Object.freeze({ id: this.#nextId++, kind, position: Object.freeze({ x, y, z }) }));
  }
}
