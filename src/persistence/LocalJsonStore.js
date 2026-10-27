/**
 * JSON values in localStorage that never throw: blocked or corrupt storage reads as the
 * fallback, and failed writes are dropped (scores just won't survive a refresh).
 */
export class LocalJsonStore {
  #storage;

  constructor(storage = globalThis.localStorage) {
    this.#storage = storage;
  }

  read(key, fallback) {
    try {
      return JSON.parse(this.#storage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  write(key, value) {
    try {
      this.#storage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked (private window): nothing sensible to do mid-game.
    }
  }
}
