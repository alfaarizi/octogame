export const ItemKind = Object.freeze({ FLASHLIGHT: 'flashlight', CAMERA: 'camera', BATTERY: 'battery' });
export const ITEM_NAMES = Object.freeze({ flashlight: 'Flashlight', camera: 'Camera', battery: 'Battery pack' });
/** Center height of each ground mesh above its supporting surface. */
export const ITEM_RESTING_HEIGHT = Object.freeze({ flashlight: .05, camera: .105, battery: .098 });

/** Two stable slots, one active hand. Items retain their identity when dropped. */
export class Inventory {
  #slots = [null, null];
  #activeSlot = 0;

  get slots() { return [...this.#slots]; }
  get activeSlot() { return this.#activeSlot; }
  get activeItem() { return this.#slots[this.#activeSlot]; }
  get isFull() { return this.#slots.every(Boolean); }
  has(kind) { return this.#slots.some((item) => item?.kind === kind); }

  reset() { this.#slots = [null, null]; this.#activeSlot = 0; }

  pickUp(item) {
    const emptySlot = this.#slots.indexOf(null);
    if (emptySlot < 0) return false;
    this.#slots[emptySlot] = item;
    if (!this.activeItem) this.#activeSlot = emptySlot;
    return true;
  }

  select(slot) {
    if (slot === 0 || slot === 1) this.#activeSlot = slot;
  }

  drop() {
    const item = this.activeItem;
    this.#slots[this.#activeSlot] = null;
    return item;
  }
}
