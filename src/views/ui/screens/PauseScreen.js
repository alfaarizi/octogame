import { requireElement } from '../dom.js';
import { UiPanel } from '../UiPanel.js';

/** Pause and case file; explicit resume leaves photo download links usable. */
export class PauseScreen extends UiPanel {
  #onResume = () => {};
  #onQuit = () => {};
  #onNoHostilesChange = () => {};

  constructor() {
    super('pause');
    const quitButton = requireElement('quit');
    requireElement('resume').addEventListener('click', () => this.#onResume());
    quitButton.addEventListener('click', () => this.#onQuit());
    requireElement('pause-no-hostiles').addEventListener('change', (event) => this.#onNoHostilesChange(event.target.checked));
  }

  onResume(listener) {
    this.#onResume = listener;
  }

  onQuit(listener) {
    this.#onQuit = listener;
  }

  onNoHostilesChange(listener) { this.#onNoHostilesChange = listener; }
  setNoHostiles(disabled) { requireElement('pause-no-hostiles').checked = disabled; }
}
