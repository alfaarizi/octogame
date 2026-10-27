import { requireElement } from '../dom.js';
import { MESSAGES } from '../messages.js';
import { UiPanel } from '../UiPanel.js';
import { LeaderboardList } from './LeaderboardList.js';

/** "You escaped!" / "Caught!", the leaderboard, and play again (Enter) or next player (N). */
export class ResultScreen extends UiPanel {
  #title = requireElement('end-title');
  #detail = requireElement('end-detail');
  #leaderboard;
  #candiesRequired;
  #inputDelayMs;
  #acceptsInputAt = 0;
  #onPlayAgain = () => {};
  #onNextPlayer = () => {};

  constructor({ candiesRequired, leaderboardSize, inputDelayMs }) {
    super('end');
    this.#candiesRequired = candiesRequired;
    this.#inputDelayMs = inputDelayMs;
    this.#leaderboard = new LeaderboardList(requireElement('board-end'), { candiesRequired, size: leaderboardSize });
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

  /** @param result RoundResult  @param rank 1-based place on the board */
  show(result, rank, rankedResults) {
    this.#title.textContent = result.escaped ? MESSAGES.escapedTitle : MESSAGES.caughtTitle;
    this.#detail.textContent = result.escaped
      ? MESSAGES.escapedDetail(result, rank)
      : MESSAGES.caughtDetail(result, this.#candiesRequired);
    this.#leaderboard.render(rankedResults, result);
    this.#acceptsInputAt = performance.now() + this.#inputDelayMs;
    super.show();
  }

  #handleKey(event) {
    if (!this.isVisible) return;
    if (event.code === 'Enter') {
      // Otherwise a focused button would also fire
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
