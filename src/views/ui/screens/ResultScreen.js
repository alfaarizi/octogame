import { requireElement } from '../dom.js';
import { MESSAGES } from '../messages.js';
import { UiPanel } from '../UiPanel.js';
import { LeaderboardList } from './LeaderboardList.js';

/** @typedef {import('../../../models/round/Round.js').RoundResult} RoundResult */

/** "You escaped!" / "Caught!", the leaderboard, and play again (Enter) or next player (N). */
export class ResultScreen extends UiPanel {
  #title = requireElement('end-title');
  #detail = requireElement('end-detail');
  #leaderboard;
  #evidenceRequired;
  #inputDelay;
  #acceptsInputAt = 0;
  #onPlayAgain = () => {};
  #onNextPlayer = () => {};

  /**
   * @param {object} options
   * @param {number} options.evidenceRequired
   * @param {number} options.leaderboardSize
   * @param {number} options.inputDelay - Seconds to ignore choices for after the screen appears.
   */
  constructor({ evidenceRequired, leaderboardSize, inputDelay }) {
    super('end');
    this.#evidenceRequired = evidenceRequired;
    this.#inputDelay = inputDelay;
    this.#leaderboard = new LeaderboardList(requireElement('board-end'), { evidenceRequired, size: leaderboardSize });
    requireElement('again').addEventListener('click', () => this.#choose(this.#onPlayAgain));
    requireElement('next').addEventListener('click', () => this.#choose(this.#onNextPlayer));
    window.addEventListener('keydown', (event) => this.#handleKey(event));
  }

  onPlayAgain(listener) {
    this.#onPlayAgain = listener;
  }

  onNextPlayer(listener) {
    this.#onNextPlayer = listener;
  }

  /**
   * Fills in the outcome and the leaderboard, then shows the screen.
   * @param {RoundResult} result - The round that just ended.
   * @param {number} rank - Its 1-based place on the board.
   * @param {RoundResult[]} rankedResults - The leaderboard, best first.
   */
  open(result, rank, rankedResults, isPractice = false) {
    this.#title.textContent = result.escaped ? MESSAGES.escapedTitle : MESSAGES.caughtTitle;
    this.#detail.textContent = result.escaped
      ? MESSAGES.escapedDetail(result, rank)
      : MESSAGES.caughtDetail(result, this.#evidenceRequired);
    if (isPractice) this.#detail.textContent = 'Development round — no leaderboard entry. Your photographs are below.';
    this.#leaderboard.render(rankedResults, result);
    this.#acceptsInputAt = performance.now() + this.#inputDelay * 1000;
    this.show();
  }

  #handleKey(event) {
    if (!this.isVisible) return;
    if (event.code === 'Enter') {
      // Otherwise a focused button would also fire.
      event.preventDefault();
      this.#choose(this.#onPlayAgain);
    } else if (event.code === 'KeyN') {
      this.#choose(this.#onNextPlayer);
    }
  }

  /** Ignores choices for a moment after showing, so a panicked click doesn't skip the result. */
  #choose(listener) {
    if (performance.now() >= this.#acceptsInputAt) listener();
  }
}
