/** Remembers the last value written under each key, so the page is only touched when something actually changes. */
export class ValueChangeTracker {
  #lastValues = new Map();

  /** Calls apply(value), unless `value` is what was last applied under `key`. */
  applyIfChanged(key, value, apply) {
    if (this.#lastValues.has(key) && this.#lastValues.get(key) === value) return;
    this.#lastValues.set(key, value);
    apply(value);
  }

  /** Forgets everything, so the next value for every key is applied. */
  forget() {
    this.#lastValues.clear();
  }
}
