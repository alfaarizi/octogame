import { requireElement } from '../dom.js';
import { MESSAGES } from '../messages.js';
import { UiPanel } from '../UiPanel.js';
import { LeaderboardList } from './LeaderboardList.js';

/** @typedef {import('../../gameplay/round/Round.js').RoundResult} RoundResult */

/** Name entry, chicken mode, how-to-play and the leaderboard. */
export class TitleScreen extends UiPanel {
  #nameInput = requireElement('name');
  #chickenModeToggle = requireElement('chicken');
  #leaderboard;
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

  /** @param {(session: { playerName: string, chickenMode: boolean }) => void} listener - Called when a round should start. */
  onStart(listener) {
    this.#onStart = listener;
  }

  /**
   * @param {{ playerName?: string, chickenMode?: boolean }} prefill - Values to put in the form.
   * @param {RoundResult[]} rankedResults - The leaderboard, best first.
   */
  show({ playerName = '', chickenMode = false }, rankedResults) {
    this.#nameInput.value = playerName;
    this.#chickenModeToggle.checked = chickenMode;
    this.#leaderboard.render(rankedResults);
    super.show();
    this.#nameInput.focus();
  }
}
