import { GameEvent } from '../../core/GameEvent.js';
import { Countdown } from '../../utils.js';

/** @typedef {import('../../types.js').Movement} Movement */

const FIRST_STEP_DELAY = 0.1;

/** Announces a footstep at walking pace while the player moves, faster while sprinting. */
export class FootstepCue {
  #events;
  #interval;
  #sprintRate;
  #countdown = new Countdown(FIRST_STEP_DELAY);

  constructor(events, { footstepInterval, sprintFootstepRate }) {
    this.#events = events;
    this.#interval = footstepInterval;
    this.#sprintRate = sprintFootstepRate;
  }

  reset() {
    this.#countdown.restart(FIRST_STEP_DELAY);
  }

  /**
   * @param {number} seconds - Time since the last frame.
   * @param {Movement} movement
   */
  update(seconds, { moving, sprinting }) {
    if (!moving) {
      this.reset();
      return;
    }
    if (!this.#countdown.tick(seconds * (sprinting ? this.#sprintRate : 1))) return;
    this.#countdown.restart(this.#interval);
    this.#events.emit(GameEvent.PLAYER_STEPPED, { sprinting });
  }
}
