import { GameEvent } from '../core/GameEvent.js';

export const RoundOutcome = Object.freeze({ ESCAPED: 'escaped', CAUGHT: 'caught' });

/**
 * @typedef {object} RoundResult
 * @property {string} playerName
 * @property {boolean} escaped
 * @property {number} timeSeconds
 * @property {number} candiesCollected
 * @property {number} finishedAt  epoch milliseconds
 */

/** Score-keeping for one attempt: the clock, the candy count, and opening the exit. */
export class Round {
  #events;
  #exitDoor;
  #candiesRequired;
  #elapsed = 0;
  #candiesCollected = 0;

  constructor({ events, exitDoor, candiesRequired }) {
    this.#events = events;
    this.#exitDoor = exitDoor;
    this.#candiesRequired = candiesRequired;
  }

  get elapsed() {
    return this.#elapsed;
  }

  get candiesCollected() {
    return this.#candiesCollected;
  }

  get candiesRequired() {
    return this.#candiesRequired;
  }

  start() {
    this.#elapsed = 0;
    this.#candiesCollected = 0;
    this.#exitDoor.lock();
    this.#events.emit(GameEvent.ROUND_STARTED, { candiesRequired: this.#candiesRequired });
  }

  tick(seconds) {
    this.#elapsed += seconds;
  }

  recordCandy() {
    this.#candiesCollected++;
    this.#events.emit(GameEvent.CANDY_COLLECTED, { collected: this.#candiesCollected, required: this.#candiesRequired });
    if (this.#candiesCollected >= this.#candiesRequired && !this.#exitDoor.isUnlocked) {
      this.#exitDoor.unlock();
      this.#events.emit(GameEvent.EXIT_UNLOCKED);
    }
  }

  /** @returns {RoundResult} */
  summarize(playerName, outcome) {
    return Object.freeze({
      playerName,
      escaped: outcome === RoundOutcome.ESCAPED,
      timeSeconds: this.#elapsed,
      candiesCollected: this.#candiesCollected,
      finishedAt: Date.now(),
    });
  }
}
