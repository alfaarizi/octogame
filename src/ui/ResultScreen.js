import { requireElement } from './dom.js';
import { LeaderboardList } from './LeaderboardList.js';
import { Messages } from './messages.js';
import { UiPanel } from './UiPanel.js';

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
    this.#title.textContent = result.escaped ? Messages.escapedTitle : Messages.caughtTitle;
    this.#detail.textContent = result.escaped
      ? Messages.escapedDetail(result, rank)
      : Messages.caughtDetail(result, this.#candiesRequired);
    this.#leaderboard.render(rankedResults, result);
    this.#acceptsInputAt = performance.now() + this.#inputDelayMs;
    super.show();
  }

  #handleKey(event) {
    if (!this.isVisible) return;
    if (event.code === 'Enter') {
      event.preventDefault(); // otherwise a focused button would also fire
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
