/** A countdown for things that repeat at a rate, such as footsteps or a heartbeat. */
export class Cooldown {
  #remaining;

  constructor(initialSeconds = 0) {
    this.#remaining = initialSeconds;
  }

  /** Advances the countdown and reports whether it has run out. Call restart() after acting on it. */
  tick(seconds) {
    this.#remaining -= seconds;
    return this.#remaining <= 0;
  }

  restart(seconds) {
    this.#remaining = seconds;
  }
}
