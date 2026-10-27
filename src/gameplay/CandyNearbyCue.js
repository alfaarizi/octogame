import { Cooldown } from '../core/Cooldown.js';
import { GameEvent } from '../core/GameEvent.js';

/** While the player is close to a candy, announces it every so often (heard as a sparkle). */
export class CandyNearbyCue {
  #events;
  #range;
  #interval;
  #cooldown = new Cooldown();

  constructor(events, { candySparkleRange, candySparkleInterval }) {
    this.#events = events;
    this.#range = candySparkleRange;
    this.#interval = candySparkleInterval;
  }

  reset() {
    this.#cooldown.restart(0);
  }

  /** @param nearestCandy { item, distance } from PickupField.nearest, or null */
  update(seconds, nearestCandy) {
    if (!nearestCandy || nearestCandy.distance >= this.#range) return;
    if (!this.#cooldown.tick(seconds)) return;
    this.#cooldown.restart(this.#interval);
    this.#events.emit(GameEvent.CANDY_NEARBY, { position: nearestCandy.item.position });
  }
}
