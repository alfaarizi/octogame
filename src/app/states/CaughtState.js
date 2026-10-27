import { GameEvent } from '../../core/GameEvent.js';
import { chance } from '../../core/random.js';
import { STANDING_STILL } from '../../gameplay/Player.js';
import { RoundOutcome } from '../../gameplay/Round.js';
import { FlashColor } from '../../ui/ScreenEffects.js';

const GENTLE_FADE_SECONDS = 1.4;
const CAUGHT_FLASH_SECONDS = 0.9;
const BEAM_STROBE = Object.freeze({ chance: 0.3, dim: 0.15 });

/** The ghost got you: the jump scare (or a gentle fade in chicken mode), then the result. */
export class CaughtState {
  #context;
  #game;
  #session;
  #elapsed = 0;
  #hasFlashed = false;

  /** @param game the Game, which this state asks to move on via showResult() */
  constructor(context, game, session) {
    this.#context = context;
    this.#game = game;
    this.#session = session;
  }

  enter() {
    const { events, ui, views } = this.#context;
    ui.hud.hide();
    events.emit(GameEvent.JUMP_SCARE_STARTED, { gentle: this.#session.chickenMode, listenerPosition: { ...views.firstPerson.eye } });
    if (this.#session.chickenMode) {
      views.ghost.hide();
      ui.effects.flash(FlashColor.FADE_TO_BLACK, GENTLE_FADE_SECONDS);
    }
  }

  update(seconds) {
    this.#elapsed += seconds;
    const { config, world } = this.#context;
    if (!this.#session.chickenMode) this.#playJumpScare(seconds, config.jumpScare);
    const duration = this.#session.chickenMode ? config.jumpScare.gentleDuration : config.jumpScare.duration;
    if (this.#elapsed > duration) {
      this.#game.showResult(world.round.summarize(this.#session.playerName, RoundOutcome.CAUGHT));
    }
  }

  /** Face in the camera, screen shaking, beam strobing, then a red flash. */
  #playJumpScare(seconds, { shakeAmount, shakeFadeTime, flashAt }) {
    const { ui, views, world } = this.#context;
    const { firstPerson } = views;
    firstPerson.update(seconds, world.player, STANDING_STILL);
    views.ghost.showJumpScare(firstPerson.camera, this.#elapsed, seconds);
    firstPerson.shake(shakeAmount * Math.max(0, 1 - this.#elapsed / shakeFadeTime));
    firstPerson.setBeamBrightness(chance(BEAM_STROBE.chance) ? BEAM_STROBE.dim : 1);
    if (!this.#hasFlashed && this.#elapsed > flashAt) {
      this.#hasFlashed = true;
      ui.effects.flash(FlashColor.CAUGHT, CAUGHT_FLASH_SECONDS);
    }
  }
}
