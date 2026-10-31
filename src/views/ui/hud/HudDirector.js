import { GameEvent } from '../../../core/GameEvent.js';
import { MESSAGES } from '../messages.js';
import { FlashColor } from './ScreenEffects.js';

const HintDuration = Object.freeze({ SHORT: 1.5, NORMAL: 2, LONG: 3, INTRO: 5 });
const VIGNETTE = Object.freeze({ curve: 1.5, max: 0.85 });

/** Decides what the HUD says: hints for game events, and the meters and vignette each frame. */
export class HudDirector {
  #hud;
  #effects;

  constructor(events, hud, effects) {
    this.#hud = hud;
    this.#effects = effects;
    this.#subscribe(events);
  }

  show() {
    this.#hud.show();
  }

  /** Hides the HUD and clears the danger vignette. */
  hide() {
    this.#hud.hide();
    this.#effects.clear();
  }

  /**
   * @param {object} frame - The state of the round this frame.
   * @param {number} frame.batteryCharge - From 0 to 1.
   * @param {boolean} frame.batteryLow - Whether the battery is below the low-battery level.
   * @param {number} frame.stamina - From 0 to 1.
   * @param {number} frame.elapsed - Round time, in seconds.
   * @param {number} frame.threatCloseness - How close the ghost is, from 0 to 1.
   */
  update({ batteryCharge, batteryLow, stamina, elapsed, threatCloseness, ...equipment }) {
    this.#hud.setEquipment(equipment);
    this.#hud.setBattery(batteryCharge, batteryLow);
    this.#hud.setStamina(stamina);
    this.#hud.setTimer(elapsed);
    this.#effects.setVignette(Math.pow(threatCloseness, VIGNETTE.curve) * VIGNETTE.max);
  }

  #subscribe(events) {
    events.on(GameEvent.FEEDBACK, ({ text, seconds }) => this.#hud.showHint(text, seconds));
    const hint = (type, text, seconds) => events.on(type, () => this.#hud.showHint(text, seconds));

    events.on(GameEvent.ROUND_STARTED, ({ evidenceRequired }) => {
      this.#hud.reset();
      this.#hud.setEvidence(0, evidenceRequired);
      this.#hud.showHint(MESSAGES.roundIntro(evidenceRequired), HintDuration.INTRO);
    });
    events.on(GameEvent.EVIDENCE_COLLECTED, ({ collected, required }) => {
      this.#hud.setEvidence(collected, required);
      if (collected < required) this.#hud.showHint(MESSAGES.evidenceRemaining(required - collected), HintDuration.NORMAL);
    });
    events.on(GameEvent.EXIT_UNLOCKED, () => {
      this.#effects.flash(FlashColor.EXIT_OPEN, 0.8);
      this.#hud.showHint(MESSAGES.exitOpen, HintDuration.INTRO);
    });

    hint(GameEvent.BATTERY_COLLECTED, MESSAGES.batteryCollected, HintDuration.SHORT);
    hint(GameEvent.FLASHLIGHT_LOW, MESSAGES.batteryLow, HintDuration.NORMAL);
    hint(GameEvent.FLASHLIGHT_DEPLETED, MESSAGES.flashlightDepleted, HintDuration.LONG);
    hint(GameEvent.FLASHLIGHT_TOGGLE_FAILED, MESSAGES.flashlightDead, HintDuration.NORMAL);
    hint(GameEvent.GHOST_WOKE, MESSAGES.ghostWoke, HintDuration.LONG);
    hint(GameEvent.GHOST_BANISHED, MESSAGES.ghostBanished, HintDuration.NORMAL);
  }
}
