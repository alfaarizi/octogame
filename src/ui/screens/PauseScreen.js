import { requireElement } from '../dom.js';
import { UiPanel } from '../UiPanel.js';

/** Shown while the mouse is released mid-round. Clicking anywhere (except Quit) resumes. */
export class PauseScreen extends UiPanel {
  #onResume = () => {};
  #onQuit = () => {};

  constructor() {
    super('pause');
    const quitButton = requireElement('quit');
    this.root.addEventListener('click', (event) => {
      if (event.target !== quitButton) this.#onResume();
    });
    quitButton.addEventListener('click', () => this.#onQuit());
  }

  onResume(listener) {
    this.#onResume = listener;
  }

  onQuit(listener) {
    this.#onQuit = listener;
  }
}
