import { distanceBetween, randomItem, shuffled } from '../utils.js';

/** @typedef {import('../types.js').CandySpot} CandySpot */
/** @typedef {import('../types.js').Point3} Point3 */

const FAR_SPOT_CHOICES = 2;

/** Chooses where candies, batteries and the ghost appear each round. */
export class SpawnTable {
  #candySpots;
  #batterySpots;
  #ghostSpots;
  #maxCandiesPerRoom;

  /**
   * @param {object} spots
   * @param {readonly CandySpot[]} spots.candySpots
   * @param {readonly Point3[]} spots.batterySpots
   * @param {readonly Point3[]} spots.ghostSpots
   * @param {number} [spots.maxCandiesPerRoom]
   */
  constructor({ candySpots, batterySpots, ghostSpots, maxCandiesPerRoom = 2 }) {
    this.#candySpots = candySpots;
    this.#batterySpots = batterySpots;
    this.#ghostSpots = ghostSpots;
    this.#maxCandiesPerRoom = maxCandiesPerRoom;
  }

  /** Random candy spots, spread out so no room has more than its share. */
  pickCandySpots(count) {
    const perRoom = new Map();
    const picked = [];
    for (const spot of shuffled(this.#candySpots)) {
      if (picked.length === count) break;
      const inRoom = perRoom.get(spot.room) ?? 0;
      if (inRoom >= this.#maxCandiesPerRoom) continue;
      perRoom.set(spot.room, inRoom + 1);
      picked.push(spot);
    }
    return picked;
  }

  pickBatterySpots(count) {
    return shuffled(this.#batterySpots).slice(0, count);
  }

  randomGhostSpot() {
    return randomItem(this.#ghostSpots);
  }

  /**
   * One of the ghost spots farthest from `position`, picked at random so respawns aren't predictable.
   * @param {Point3} position
   * @returns {Point3}
   */
  ghostSpotFarFrom(position) {
    const farthestFirst = [...this.#ghostSpots].sort((a, b) => distanceBetween(b, position) - distanceBetween(a, position));
    return randomItem(farthestFirst.slice(0, FAR_SPOT_CHOICES));
  }
}
