import { requireElement } from './dom.js';

/** A part of the page that can be shown and hidden. Every screen and the HUD build on this. */
export class UiPanel {
  #root;

  /** @param elementId the id of the panel's element in index.html */
  constructor(elementId) {
    this.#root = requireElement(elementId);
  }

  get root() {
    return this.#root;
  }

  get isVisible() {
    return !this.#root.classList.contains('hidden');
  }

  show() {
    this.#root.classList.remove('hidden');
  }

  hide() {
    this.#root.classList.add('hidden');
  }
}
