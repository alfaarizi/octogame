import { GameEvent } from '../../core/GameEvent.js';
import { atHeight, chance, Countdown, pointAlongHeading, randomInRange, weightedRandomItem } from '../../utils.js';

/** @typedef {import('../../types.js').Point3} Point3 */

export const AmbientNoiseKind = Object.freeze({ CREAK: 'creak', THUMP: 'thump', GIGGLE: 'giggle' });

const NOISE_CHOICES = Object.freeze([
  { value: AmbientNoiseKind.CREAK, weight: 0.4 },
  { value: AmbientNoiseKind.THUMP, weight: 0.3 },
  { value: AmbientNoiseKind.GIGGLE, weight: 0.3 },
]);
const DISTANCE_FROM_PLAYER = Object.freeze({ min: 5, max: 11 });
const HEIGHT = Object.freeze({ min: 0.5, max: 2.5 });

/** Every so often, a harmless noise somewhere near the player, to keep everyone on edge. */
export class AmbientNoiseCue {
  #events;
  #interval;
  #lanternFlickerChance;
  #countdown = new Countdown();

  constructor(events, { ambientNoiseInterval, ambientNoiseLanternFlickerChance }) {
    this.#events = events;
    this.#interval = ambientNoiseInterval;
    this.#lanternFlickerChance = ambientNoiseLanternFlickerChance;
  }

  reset() {
    this.#countdown.restart(randomInRange(this.#interval));
  }

  /**
   * @param {number} seconds - Time since the last frame.
   * @param {Point3} playerPosition
   */
  update(seconds, playerPosition) {
    if (!this.#countdown.tick(seconds)) return;
    this.reset();
    const spot = pointAlongHeading(playerPosition, Math.random() * Math.PI * 2, randomInRange(DISTANCE_FROM_PLAYER));
    this.#events.emit(GameEvent.AMBIENT_NOISE, {
      kind: weightedRandomItem(NOISE_CHOICES),
      position: atHeight(spot, playerPosition.y + randomInRange(HEIGHT)),
      flickerLanterns: chance(this.#lanternFlickerChance),
    });
  }
}
