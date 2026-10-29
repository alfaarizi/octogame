import { requireElement } from '../dom.js';
import { MESSAGES } from '../messages.js';
import { UiPanel } from '../UiPanel.js';
import { LeaderboardList } from './LeaderboardList.js';

/** @typedef {import('../../../models/round/Round.js').RoundResult} RoundResult */
/** @typedef {import('../../../types.js').Session} Session */

/** Name entry, chicken mode, how-to-play and the leaderboard. */
export class TitleScreen extends UiPanel {
  #nameInput = /** @type {HTMLInputElement} */ (requireElement('name'));
  #chickenModeToggle = /** @type {HTMLInputElement} */ (requireElement('chicken'));
  #leaderboard;
  /** @type {(session: Session) => void} */
  #onStart = () => {};

  constructor({ candiesRequired, leaderboardSize }) {
    super('title');
    this.#leaderboard = new LeaderboardList(requireElement('board-title'), { candiesRequired, size: leaderboardSize });
    requireElement('start-form').addEventListener('submit', (event) => {
      event.preventDefault();
      this.#onStart({
        playerName: this.#nameInput.value.trim() || MESSAGES.defaultPlayerName,
        chickenMode: this.#chickenModeToggle.checked,
      });
    });
  }

  /** @param {(session: Session) => void} listener - Called when a round should start. */
  onStart(listener) {
    this.#onStart = listener;
  }

  /**
   * Fills in the form and the leaderboard, then shows the screen.
   * @param {Partial<Session>} prefill - Values to put in the form.
   * @param {RoundResult[]} rankedResults - The leaderboard, best first.
   */
  open({ playerName = '', chickenMode = false }, rankedResults) {
    this.#nameInput.value = playerName;
    this.#chickenModeToggle.checked = chickenMode;
    this.#leaderboard.render(rankedResults);
    this.show();
    this.#nameInput.focus();
  }
}
