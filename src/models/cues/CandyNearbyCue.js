import { GameEvent } from '../../core/GameEvent.js';
import { Countdown } from '../../utils.js';

/** @typedef {import('../pickups/PickupField.js').NearestPickup} NearestPickup */

/** While the player is close to a candy, announces it every so often (heard as a sparkle). */
export class CandyNearbyCue {
  #events;
  #range;
  #interval;
  #countdown = new Countdown();

  constructor(events, { candySparkleRange, candySparkleInterval }) {
    this.#events = events;
    this.#range = candySparkleRange;
    this.#interval = candySparkleInterval;
  }

  reset() {
    this.#countdown.restart(0);
  }

  /**
   * @param {number} seconds - Time since the last frame.
   * @param {NearestPickup | null} nearestCandy - The result of PickupField.nearest().
   */
  update(seconds, nearestCandy) {
    if (!nearestCandy || nearestCandy.distance >= this.#range) return;
    if (!this.#countdown.tick(seconds)) return;
    this.#countdown.restart(this.#interval);
    this.#events.emit(GameEvent.CANDY_NEARBY, { position: nearestCandy.item.position });
  }
}
