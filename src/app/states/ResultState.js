import { STANDING_STILL } from '../../gameplay/player/Player.js';
import { FlashColor } from '../../ui/hud/ScreenEffects.js';

/** @typedef {import('../../gameplay/round/Round.js').RoundResult} RoundResult */

const ESCAPE_FLASH_SECONDS = 1.2;

/** After a round: save the result and show where it landed on the leaderboard. */
export class ResultState {
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
    const { persistence, pointerLock, ui, views, world } = this.#context;
    pointerLock.release();
    world.ghost.deactivate();
    views.ghost.hide();
    // Undo any jump-scare shake.
    views.firstPerson.update(0, world.player, STANDING_STILL);
    views.firstPerson.setBeamBrightness(world.flashlight.brightness);
    ui.hud.hide();
    const { rank, ranked } = persistence.scores.record(this.#result);
    ui.result.show(this.#result, rank, ranked);
    if (this.#result.escaped) ui.effects.flash(FlashColor.ESCAPED, ESCAPE_FLASH_SECONDS);
  }

  exit() {
    this.#context.ui.result.hide();
  }
}
