import { GameEvent } from '../../core/GameEvent.js';
import { randomInRange } from '../../utils.js';

const FLICKER_LENGTH = { min: 0.04, max: 0.15 };
const FLICKER_GAP = { min: 0.15, max: 0.9 };
const FLICKER_MAX_BRIGHTNESS = 0.25;
const LOW_BATTERY_FLICKER_STRENGTH = 0.4;
const LOW_BATTERY_MIN_BRIGHTNESS = 0.45;

/** The flashlight's battery, switch and flicker. `brightness` (0–1) is what the beam should show. */
export class Flashlight {
  #config;
  #events;
  #random;
  #charge = 1;
  #isOn = true;
  #brightness = 1;
  #flickerUntil = 0;
  #nextFlickerAt = 0;
  #hasWarnedLow = false;

  constructor(config, events, random = Math.random) {
    this.#config = config;
    this.#events = events;
    this.#random = random;
  }

  /** 0–1 */
  get charge() {
    return this.#charge;
  }

  get isOn() {
    return this.#isOn;
  }

  /** On and with charge left, so it can light things up. */
  get isEmitting() {
    return this.#isOn && this.#charge > 0;
  }

  get isLow() {
    return this.#charge < this.#config.lowBatteryLevel;
  }

  get brightness() {
    return this.#brightness;
  }

  reset() {
    this.#charge = 1;
    this.#isOn = true;
    this.#brightness = 1;
    this.#flickerUntil = 0;
    this.#nextFlickerAt = 0;
    this.#hasWarnedLow = false;
  }

  toggle() {
    if (this.#charge <= 0) {
      this.#events.emit(GameEvent.FLASHLIGHT_TOGGLE_FAILED);
      return;
    }
    this.#isOn = !this.#isOn;
    this.#events.emit(GameEvent.FLASHLIGHT_TOGGLED, { on: this.#isOn });
  }

  recharge(amount) {
    this.#charge = Math.min(1, this.#charge + amount);
  }

  /**
   * @param now          round time in seconds
   * @param interference 0–1, how strongly a nearby ghost makes the light stutter
   */
  update(seconds, now, interference) {
    this.#drain(seconds);
    this.#warnWhenLow();
    this.#brightness = this.#isOn ? this.#batteryDimming() * this.#flicker(now, interference) : 0;
  }

  #drain(seconds) {
    if (!this.#isOn) return;
    this.#charge = Math.max(0, this.#charge - seconds / this.#config.batteryLife);
    if (this.#charge > 0) return;
    this.#isOn = false;
    this.#events.emit(GameEvent.FLASHLIGHT_DEPLETED);
  }

  #warnWhenLow() {
    if (!this.isLow) {
      this.#hasWarnedLow = false;
    } else if (!this.#hasWarnedLow && this.#charge > 0) {
      this.#hasWarnedLow = true;
      this.#events.emit(GameEvent.FLASHLIGHT_LOW);
    }
  }

  #batteryDimming() {
    if (!this.isLow) return 1;
    return LOW_BATTERY_MIN_BRIGHTNESS + (1 - LOW_BATTERY_MIN_BRIGHTNESS) * (this.#charge / this.#config.lowBatteryLevel);
  }

  /** Short random dropouts, more often the stronger the interference. Returns a brightness multiplier. */
  #flicker(now, interference) {
    const strength = Math.max(interference, this.isLow ? LOW_BATTERY_FLICKER_STRENGTH : 0);
    if (strength <= 0) return 1;
    if (now >= this.#nextFlickerAt) {
      this.#flickerUntil = now + randomInRange(FLICKER_LENGTH, this.#random);
      this.#nextFlickerAt = now + randomInRange(FLICKER_GAP, this.#random) * (1.25 - strength);
      this.#events.emit(GameEvent.FLASHLIGHT_FLICKERED);
    }
    return now < this.#flickerUntil ? this.#random() * FLICKER_MAX_BRIGHTNESS : 1;
  }
}
