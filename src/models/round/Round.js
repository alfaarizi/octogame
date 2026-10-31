import { GameEvent } from '../../core/GameEvent.js';

export const RoundOutcome = Object.freeze({ ESCAPED: 'escaped', CAUGHT: 'caught' });

/**
 * The outcome of one round, as saved to the leaderboard.
 * @typedef {object} RoundResult
 * @property {string} playerName
 * @property {boolean} escaped
 * @property {number} timeSeconds
 * @property {number} evidenceCollected
 * @property {number} finishedAt - When the round ended, in epoch milliseconds.
 */

/** Score-keeping for one attempt: the clock, the evidence count, and opening the exit. */
export class Round {
  #events;
  #exitDoor;
  #evidenceRequired;
  #elapsed = 0;
  #evidenceCollected = 0;

  constructor({ events, exitDoor, evidenceRequired }) {
    this.#events = events;
    this.#exitDoor = exitDoor;
    this.#evidenceRequired = evidenceRequired;
  }

  get elapsed() {
    return this.#elapsed;
  }

  get evidenceCollected() {
    return this.#evidenceCollected;
  }

  get evidenceRequired() {
    return this.#evidenceRequired;
  }

  start() {
    this.#elapsed = 0;
    this.#evidenceCollected = 0;
    this.#exitDoor.lock();
    this.#events.emit(GameEvent.ROUND_STARTED, { evidenceRequired: this.#evidenceRequired });
  }

  tick(seconds) {
    this.#elapsed += seconds;
  }

  recordEvidence() {
    this.#evidenceCollected++;
    this.#events.emit(GameEvent.EVIDENCE_COLLECTED, { collected: this.#evidenceCollected, required: this.#evidenceRequired });
    if (this.#evidenceCollected >= this.#evidenceRequired && !this.#exitDoor.isUnlocked) {
      this.#exitDoor.unlock();
      this.#events.emit(GameEvent.EXIT_UNLOCKED);
    }
  }

  /**
   * @param {string} playerName - Who played the round.
   * @param {string} outcome - A RoundOutcome value.
   * @returns {RoundResult} The finished round, ready for the leaderboard.
   */
  summarize(playerName, outcome) {
    return Object.freeze({
      playerName,
      escaped: outcome === RoundOutcome.ESCAPED,
      timeSeconds: this.#elapsed,
      evidenceCollected: this.#evidenceCollected,
      finishedAt: Date.now(),
    });
  }
}
