import { MESSAGES } from '../messages.js';

/** @typedef {import('../../../models/round/Round.js').RoundResult} RoundResult */

/** Renders ranked round results into an <ol>. Names go in as text, never as HTML. */
export class LeaderboardList {
  #list;
  #evidenceRequired;
  #size;

  constructor(listElement, { evidenceRequired, size }) {
    this.#list = listElement;
    this.#evidenceRequired = evidenceRequired;
    this.#size = size;
  }

  /**
   * @param {RoundResult[]} rankedResults - The leaderboard, best first.
   * @param {RoundResult | null} [highlight] - The result to mark as "you", if it made the board.
   */
  render(rankedResults, highlight = null) {
    if (rankedResults.length === 0) {
      this.#list.replaceChildren(this.#emptyRow());
      return;
    }
    const rows = rankedResults.slice(0, this.#size).map((result, index) => this.#resultRow(result, index + 1, result === highlight));
    this.#list.replaceChildren(...rows);
  }

  #emptyRow() {
    const row = document.createElement('li');
    row.className = 'empty';
    row.textContent = MESSAGES.leaderboardEmpty;
    return row;
  }

  #resultRow(result, place, isHighlighted) {
    const row = document.createElement('li');
    if (isHighlighted) row.className = 'me';
    const name = document.createElement('span');
    name.textContent = `${place}. ${result.playerName}`;
    const outcome = document.createElement('span');
    outcome.textContent = result.escaped ? MESSAGES.leaderboardEscaped(result) : MESSAGES.leaderboardCaught(result, this.#evidenceRequired);
    row.append(name, outcome);
    return row;
  }
}
