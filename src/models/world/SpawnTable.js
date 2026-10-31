import { distanceBetween, randomItem, shuffled } from '../../utils.js';

/** @typedef {import('../../types.js').Point3} Point3 */

const FAR_SPOT_CHOICES = 2;

/** Chooses battery placements and ghost destinations. */
export class SpawnTable {
  #batterySpots;
  #ghostSpots;

  /**
   * @param {object} spots
   * @param {readonly Point3[]} spots.batterySpots
   * @param {readonly Point3[]} spots.ghostSpots
   */
  constructor({ batterySpots, ghostSpots }) {
    this.#batterySpots = batterySpots;
    this.#ghostSpots = ghostSpots;
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
