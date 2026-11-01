import { STANDING_STILL } from '../models/player/Player.js';
import { FlashColor } from '../views/ui/hud/ScreenEffects.js';

/** @typedef {import('../models/round/Round.js').RoundResult} RoundResult */

const ESCAPE_FLASH_SECONDS = 1.2;

/** After a round: save the result and show where it landed on the leaderboard. */
export class ResultController {
  #context;
  #result;

  /**
   * @param {object} context - The objects built by createGameContext().
   * @param {RoundResult} result - The round that just ended.
   */
  constructor(context, result) {
    this.#context = context;
    this.#result = result;
  }

  enter() {
    const { persistence, pointerLock, simulation, ui, views } = this.#context;
    pointerLock.release();
    simulation.endRound();
    views.ghost.hide();
    // Undo any jump-scare shake.
    views.firstPerson.update(0, simulation.player, STANDING_STILL);
    views.firstPerson.setBeamBrightness(simulation.flashlight.brightness);
    ui.hud.hide();
    const { rank, ranked } = persistence.scores.record(this.#result);
    ui.result.open(this.#result, rank, ranked);
    if (this.#result.escaped) ui.effects.flash(FlashColor.ESCAPED, ESCAPE_FLASH_SECONDS);
  }

  exit() {
    this.#context.ui.result.hide();
  }
}
