import { STANDING_STILL } from '../models/player/Player.js';

/** @typedef {import('../types.js').Pose} Pose */
/** @typedef {import('../types.js').Session} Session */

const IDLE_LOOK = Object.freeze({ yawRate: 0.18, yawSwing: 0.7, pitch: -0.08, pitchRate: 0.11, pitchSwing: 0.05 });

/** The title screen, over the dark foyer with the camera slowly looking around. */
export class TitleController {
  #context;
  #prefill;
  #elapsed = 0;

  /**
   * @param {object} context - The objects built by createGameContext().
   * @param {Session} prefill - Values to put in the form.
   */
  constructor(context, prefill) {
    this.#context = context;
    this.#prefill = prefill;
  }

  enter() {
    const { persistence, simulation, ui, views } = this.#context;
    simulation.clear();
    views.ghost.hide();
    views.pickups.sync();
    ui.hud.hide();
    ui.title.open(this.#prefill, persistence.scores.loadRanked());
  }

  exit() {
    this.#context.ui.title.hide();
  }

  update(seconds) {
    this.#elapsed += seconds;
    const { level, views } = this.#context;
    /** @type {Pose} */
    const idlePose = {
      position: level.playerStart,
      yaw: Math.sin(this.#elapsed * IDLE_LOOK.yawRate) * IDLE_LOOK.yawSwing,
      pitch: IDLE_LOOK.pitch + Math.sin(this.#elapsed * IDLE_LOOK.pitchRate) * IDLE_LOOK.pitchSwing,
    };
    views.firstPerson.update(seconds, idlePose, STANDING_STILL);
    views.firstPerson.setBeamBrightness(1);
  }
}
