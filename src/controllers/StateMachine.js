/** Runs one game state at a time. A state may define enter(), exit() and update(seconds). */
export class StateMachine {
  #current = null;

  get current() {
    return this.#current;
  }

  transition(next) {
    this.#current?.exit?.();
    this.#current = next;
    next.enter?.();
  }

  update(seconds) {
    this.#current?.update?.(seconds);
  }
}
