import { formatRoundTime } from '../../utils.js';
import { requireElement } from '../dom.js';
import { UiPanel } from '../UiPanel.js';
import { ValueChangeTracker } from '../ValueChangeTracker.js';

/** The in-round overlay: candy count, timer, battery and stamina bars, and hint text. */
export class Hud extends UiPanel {
  #candies = requireElement('candy');
  #timer = requireElement('timer');
  #batteryFill = requireElement('battery-fill');
  #staminaMeter = requireElement('stamina-meter');
  #staminaFill = requireElement('stamina-fill');
  #hint = requireElement('hint');
  #shown = new ValueChangeTracker();
  #hintTimeout = 0;

  constructor() {
    super('hud');
  }

  /** Forgets what's on screen, so the next round redraws everything. */
  reset() {
    this.#shown.forget();
  }

  setCandies(collected, required) {
    this.#shown.applyIfChanged('candies', collected, () => {
      this.#candies.textContent = `🍬 ${collected} / ${required}`;
      this.#candies.classList.remove('bump');
      // Forces a reflow so the CSS animation restarts.
      void this.#candies.offsetWidth;
      this.#candies.classList.add('bump');
    });
  }

  setTimer(seconds) {
    this.#shown.applyIfChanged('timer', formatRoundTime(seconds), (text) => (this.#timer.textContent = text));
  }

  setBattery(charge, isLow) {
    this.#shown.applyIfChanged('battery', Math.round(charge * 200), () => (this.#batteryFill.style.width = `${charge * 100}%`));
    this.#shown.applyIfChanged('batteryLow', isLow, () => this.#batteryFill.classList.toggle('low', isLow));
  }

  /** The stamina bar only shows while it isn't full. */
  setStamina(stamina) {
    this.#shown.applyIfChanged('stamina', Math.round(stamina * 100), () => {
      this.#staminaFill.style.width = `${stamina * 100}%`;
      this.#staminaMeter.style.visibility = stamina < 1 ? 'visible' : 'hidden';
    });
  }

  showHint(text, seconds) {
    this.#hint.textContent = text;
    this.#hint.classList.add('show');
    clearTimeout(this.#hintTimeout);
    this.#hintTimeout = setTimeout(() => this.#hint.classList.remove('show'), seconds * 1000);
  }
}
