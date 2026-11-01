import { formatRoundTime } from '../../../utils.js';
import { requireElement } from '../dom.js';
import { UiPanel } from '../UiPanel.js';
import { ValueChangeTracker } from '../ValueChangeTracker.js';
import { ITEM_NAMES } from '../../../models/player/Inventory.js';

/** The in-round overlay: evidence count, timer, battery and stamina bars, and hint text. */
export class Hud extends UiPanel {
  #evidence = requireElement('evidence');
  #timer = requireElement('timer');
  #batteryFill = requireElement('battery-fill');
  #staminaMeter = requireElement('stamina-meter');
  #staminaFill = requireElement('stamina-fill');
  #hint = requireElement('hint');
  #shown = new ValueChangeTracker();
  #hintTimeout = 0;
  #slots = [requireElement('slot-one'), requireElement('slot-two')];
  #interaction = requireElement('interaction');
  #viewfinder = requireElement('viewfinder');
  #hiding = requireElement('hiding');

  constructor() {
    super('hud');
  }

  /** Forgets what's on screen, so the next round redraws everything. */
  reset() {
    this.#shown.forget();
  }

  setEvidence(collected, required) {
    this.#shown.applyIfChanged('evidence', collected, () => {
      this.#evidence.textContent = `${collected} / ${required} FILED`;
      this.#evidence.classList.remove('bump');
      // Forces a reflow so the CSS animation restarts.
      void this.#evidence.offsetWidth;
      this.#evidence.classList.add('bump');
    });
  }

  setTimer(seconds) {
    this.#shown.applyIfChanged('timer', formatRoundTime(seconds), (text) => (this.#timer.textContent = text));
  }

  setEquipment({ inventory, prompt, hidden, cameraTarget }) {
    for (const [index, item] of inventory.slots.entries()) {
      this.#shown.applyIfChanged(`slot-${index}`, `${item?.kind}:${inventory.activeSlot === index}`, () => {
        this.#slots[index].textContent = `${String(index + 1).padStart(2, '0')} / ${item ? ITEM_NAMES[item.kind].toUpperCase() : 'EMPTY'}`;
        this.#slots[index].classList.toggle('selected', inventory.activeSlot === index);
      });
    }
    this.#interaction.textContent = prompt;
    const cameraHeld = !hidden && inventory.activeItem?.kind === 'camera';
    this.#viewfinder.classList.toggle('hidden', !cameraHeld);
    this.#viewfinder.classList.toggle('target-locked', Boolean(cameraTarget));
    this.root.classList.toggle('camera-active', cameraHeld);
    this.#hiding.classList.toggle('hidden', !hidden);
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
    this.#hintTimeout = window.setTimeout(() => this.#hint.classList.remove('show'), seconds * 1000);
  }
}
