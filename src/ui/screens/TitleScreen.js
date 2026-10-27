import { requireElement } from '../dom.js';
import { MESSAGES } from '../messages.js';
import { UiPanel } from '../UiPanel.js';
import { LeaderboardList } from './LeaderboardList.js';

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

  /** @param listener receives the session: { playerName, chickenMode } */
  onStart(listener) {
    this.#onStart = listener;
  }

  /** @param prefill { playerName, chickenMode } to put in the form */
  show({ playerName = '', chickenMode = false }, rankedResults) {
    this.#nameInput.value = playerName;
    this.#chickenModeToggle.checked = chickenMode;
    this.#leaderboard.render(rankedResults);
    super.show();
    this.#nameInput.focus();
  }
}
