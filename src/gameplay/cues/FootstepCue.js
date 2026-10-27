import { GameEvent } from '../../core/GameEvent.js';
import { Cooldown } from '../../utils.js';

const FIRST_STEP_DELAY = 0.1;

/** Announces a footstep at walking pace while the player moves, faster while sprinting. */
export class FootstepCue {
  #events;
  #interval;
  #sprintRate;
  #cooldown = new Cooldown(FIRST_STEP_DELAY);

  constructor(events, { footstepInterval, sprintFootstepRate }) {
    this.#events = events;
    this.#interval = footstepInterval;
    this.#sprintRate = sprintFootstepRate;
  }

  reset() {
    this.#cooldown.restart(FIRST_STEP_DELAY);
  }

  /** @param movement { moving, sprinting } from Player.update */
  update(seconds, { moving, sprinting }) {
    if (!moving) {
      this.reset();
      return;
    }
    if (!this.#cooldown.tick(seconds * (sprinting ? this.#sprintRate : 1))) return;
    this.#cooldown.restart(this.#interval);
    this.#events.emit(GameEvent.PLAYER_STEPPED, { sprinting });
  }
}
