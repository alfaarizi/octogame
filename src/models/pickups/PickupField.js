import { distanceBetween } from '../../utils.js';
import { ItemKind } from '../player/Inventory.js';

export const PickupKind = ItemKind;

/** Immutable ground-item snapshots. Acquisition is explicit, never proximity based. */
export class PickupField {
  #items = Object.freeze([]);
  #nextId = 1;
  get items() { return this.#items; }

  populate({ equipment = [], batterySpots = [] }) {
    this.clear();
    for (const item of equipment) this.add(item.kind, item.position);
    for (const position of batterySpots) this.add(ItemKind.BATTERY, position);
  }

  add(kind, position, id = this.#nextId++) {
    const item = Object.freeze({ id, kind, position: Object.freeze({ ...position }) });
    this.#items = Object.freeze([...this.#items, item]);
    return item;
  }

  remove(id) {
    const item = this.#items.find((entry) => entry.id === id);
    this.#items = Object.freeze(this.#items.filter((entry) => entry.id !== id));
    return item ?? null;
  }

  clear() { this.#items = Object.freeze([]); }

  nearest(kind, position) {
    const candidates = this.#items.filter((item) => item.kind === kind);
    candidates.sort((a, b) => distanceBetween(a.position, position) - distanceBetween(b.position, position));
    return candidates.length ? { item: candidates[0], distance: distanceBetween(candidates[0].position, position) } : null;
  }
}
