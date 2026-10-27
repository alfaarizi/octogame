import { requireElement } from '../dom.js';
import { ValueChangeTracker } from '../ValueChangeTracker.js';

export const FlashColor = Object.freeze({
  EXIT_OPEN: 'rgba(255, 106, 0, 0.35)',
  ESCAPED: '#ffd9a0',
  CAUGHT: '#8a0000',
  FADE_TO_BLACK: '#000',
});

/** Full-screen overlays: the red vignette as danger nears, and quick color flashes. */
export class ScreenEffects {
  #vignette = requireElement('vignette');
  #flash = requireElement('flash');
  #shown = new ValueChangeTracker();

  /** @param {number} level - Vignette opacity, from 0 to 1. */
  setVignette(level) {
    this.#shown.applyIfChanged('vignette', Math.round(level * 100) / 100, (opacity) => (this.#vignette.style.opacity = opacity));
  }

  /** Fills the screen with `color`, then fades it out over `seconds`. */
  flash(color, seconds) {
    const overlay = this.#flash;
    overlay.style.transition = 'none';
    overlay.style.background = color;
    overlay.style.opacity = 1;
    // Forces a reflow so the solid color applies before the fade starts.
    void overlay.offsetWidth;
    overlay.style.transition = `opacity ${seconds}s ease-out`;
    overlay.style.opacity = 0;
  }

  clear() {
    this.setVignette(0);
  }
}
