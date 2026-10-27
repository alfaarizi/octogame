import { Cooldown } from '../core/Cooldown.js';
import { GameEvent } from '../core/GameEvent.js';
import { chance, randomInRange, weightedRandomItem } from '../core/random.js';

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
  #cooldown = new Cooldown();

  constructor(events, { ambientNoiseInterval, ambientNoiseLanternFlickerChance }) {
    this.#events = events;
    this.#interval = ambientNoiseInterval;
    this.#lanternFlickerChance = ambientNoiseLanternFlickerChance;
  }

  reset() {
    this.#cooldown.restart(randomInRange(this.#interval));
  }

  update(seconds, playerPosition) {
    if (!this.#cooldown.tick(seconds)) return;
    this.reset();
    const angle = Math.random() * Math.PI * 2;
    const distance = randomInRange(DISTANCE_FROM_PLAYER);
    this.#events.emit(GameEvent.AMBIENT_NOISE, {
      kind: weightedRandomItem(NOISE_CHOICES),
      position: {
        x: playerPosition.x + Math.cos(angle) * distance,
        y: randomInRange(HEIGHT),
        z: playerPosition.z + Math.sin(angle) * distance,
      },
      flickerLanterns: chance(this.#lanternFlickerChance),
    });
  }
}
