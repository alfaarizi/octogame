/** @typedef {import('../../types.js').Session} Session */

const STORAGE_KEY = 'flashlight-haunt-prefs';

/**
 * The last player's name and chicken-mode choice, so the title screen remembers them.
 * Stored as { name, chicken }, the format the first version of the game used.
 */
export class PreferencesRepository {
  #store;

  constructor(store) {
    this.#store = store;
  }

  /** @returns {Session} */
  load() {
    const stored = this.#store.read(STORAGE_KEY, {});
    const isObject = stored && typeof stored === 'object';
    return {
      playerName: isObject && typeof stored.name === 'string' ? stored.name : '',
      chickenMode: isObject && stored.chicken === true,
      noHostiles: isObject && stored.noHostiles === true,
    };
  }

  /** @param {Session} session */
  save({ playerName, chickenMode, noHostiles = false }) {
    this.#store.write(STORAGE_KEY, { name: playerName, chicken: chickenMode, noHostiles });
  }
}
