/** A set of callbacks that are called together. Every subscription in the game is built on this. */
export class ListenerSet {
  #listeners = new Set();

  /** Adds `listener`. Returns a function that removes it again. */
  add(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** Calls every listener with `args`. A listener may remove itself while being called. */
  notify(...args) {
    for (const listener of [...this.#listeners]) listener(...args);
  }
}
