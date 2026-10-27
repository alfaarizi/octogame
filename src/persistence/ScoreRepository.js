import { rankResults } from '../gameplay/round/leaderboardRanking.js';

/** @typedef {import('../gameplay/round/Round.js').RoundResult} RoundResult */

const STORAGE_KEY = 'flashlight-haunt-scores';
const MAX_STORED_RESULTS = 100;

// Stored with short keys, the format the first version of the game used, so existing scores still load.
const toStored = ({ playerName, escaped, timeSeconds, candiesCollected, finishedAt }) => ({
  name: playerName,
  escaped,
  time: timeSeconds,
  candies: candiesCollected,
  at: finishedAt,
});

const fromStored = ({ name, escaped, time, candies, at }) => ({
  playerName: String(name),
  escaped: Boolean(escaped),
  timeSeconds: Number(time),
  candiesCollected: Number(candies),
  finishedAt: Number(at),
});

const isStoredResult = (value) => value && typeof value === 'object' && 'name' in value && 'time' in value;

/** The leaderboard on this device. */
export class ScoreRepository {
  #store;

  constructor(store) {
    this.#store = store;
  }

  /** @returns {RoundResult[]} Every saved result, best first. */
  loadRanked() {
    const stored = this.#store.read(STORAGE_KEY, []);
    return Array.isArray(stored) ? rankResults(stored.filter(isStoredResult).map(fromStored)) : [];
  }

  /**
   * Saves a result.
   * @param {RoundResult} result
   * @returns {{ rank: number, ranked: RoundResult[] }} Its 1-based rank, and the updated leaderboard (which contains `result` itself).
   */
  record(result) {
    const ranked = rankResults([...this.loadRanked(), result]);
    this.#store.write(STORAGE_KEY, ranked.slice(0, MAX_STORED_RESULTS).map(toStored));
    return { rank: ranked.indexOf(result) + 1, ranked };
  }
}
