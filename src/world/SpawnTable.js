import { planarDistance } from '../core/math.js';
import { randomItem, shuffled } from '../core/random.js';

const FAR_SPOT_CHOICES = 2;

/** Chooses where candies, batteries and the ghost appear each round. */
export class SpawnTable {
  #candySpots;
  #batterySpots;
  #ghostSpots;
  #maxCandiesPerRoom;

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

  /** One of the ghost spots farthest from `position`, picked at random so respawns aren't predictable. */
  ghostSpotFarFrom(position) {
    const farthestFirst = [...this.#ghostSpots].sort((a, b) => planarDistance(b, position) - planarDistance(a, position));
    return randomItem(farthestFirst.slice(0, FAR_SPOT_CHOICES));
  }
}
