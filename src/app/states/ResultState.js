import { STANDING_STILL } from '../../gameplay/Player.js';
import { FlashColor } from '../../ui/ScreenEffects.js';

const ESCAPE_FLASH_SECONDS = 1.2;

/** After a round: save the result and show where it landed on the leaderboard. */
export class ResultState {
  #context;
  #result;

  /** @param result RoundResult */
  constructor(context, result) {
    this.#context = context;
    this.#result = result;
  }

  enter() {
    const { persistence, pointerLock, ui, views, world } = this.#context;
    pointerLock.release();
    world.ghost.deactivate();
    views.ghost.hide();
    views.firstPerson.update(0, world.player, STANDING_STILL); // undo any jump-scare shake
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
