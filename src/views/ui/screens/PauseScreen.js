import { requireElement } from '../dom.js';
import { UiPanel } from '../UiPanel.js';

/** Pause and case file; explicit resume leaves photo download links usable. */
export class PauseScreen extends UiPanel {
  #onResume = () => {};
  #onQuit = () => {};

  constructor() {
    super('pause');
    const quitButton = requireElement('quit');
    requireElement('resume').addEventListener('click', () => this.#onResume());
    quitButton.addEventListener('click', () => this.#onQuit());
  }

  onResume(listener) {
    this.#onResume = listener;
  }

  onQuit(listener) {
    this.#onQuit = listener;
  }
}
