import { crashReporter } from '../app/crashReporter.js';
import { GameLoop } from '../core/GameLoop.js';
import { JumpScareController } from './JumpScareController.js';
import { ResultController } from './ResultController.js';
import { RoundController } from './RoundController.js';
import { StateMachine } from './StateMachine.js';
import { TitleController } from './TitleController.js';

/** @typedef {import('../models/round/Round.js').RoundResult} RoundResult */
/** @typedef {import('../types.js').Session} Session */

/**
 * The top level. Owns the frame loop and the state machine, and moves between
 * title -> playing -> (caught) -> result -> playing again or title. States call back here to move on.
 */
export class GameController {
  #context;
  #states = new StateMachine();
  #loop;
  #worldTime = 0;
  #session = null;

  constructor(context) {
    this.#context = context;
    this.#loop = new GameLoop({
      onFrame: (seconds) => this.#advanceFrame(seconds),
      onError: (error) => crashReporter.report(error),
    });
    this.#connectMenus();
  }

  get currentState() {
    return this.#states.current;
  }

  start() {
    this.showTitle(this.#context.persistence.preferences.load());
    this.#loop.start();
  }

  stop() {
    this.#loop.stop();
  }

  /** @param {Session} prefill - Values to put in the form. */
  showTitle(prefill) {
    this.#states.transition(new TitleController(this.#context, prefill));
  }

  /** @param {Session} session - The player's choices, kept for "Play again". */
  startRound(session) {
    this.#session = session;
    this.#states.transition(new RoundController(this.#context, this, session));
  }

  showJumpScare() {
    this.#states.transition(new JumpScareController(this.#context, this, this.#session));
  }

  /** @param {RoundResult} result - The round that just ended. */
  showResult(result) {
    this.#states.transition(new ResultController(this.#context, result));
  }

  #connectMenus() {
    const { ui, persistence, pointerLock } = this.#context;
    ui.title.onStart((session) => {
      persistence.preferences.save(session);
      this.startRound(session);
    });
    ui.pause.onResume(() => pointerLock.request());
    ui.pause.onQuit(() => this.showTitle(persistence.preferences.load()));
    ui.pause.onNoHostilesChange((noHostiles) => {
      this.#session.noHostiles = noHostiles;
      this.#context.simulation.setHostilesEnabled(!noHostiles);
      if (noHostiles) this.#context.views.ghost.hide();
      persistence.preferences.save(this.#session);
    });
    ui.result.onPlayAgain(() => this.startRound(this.#session));
    ui.result.onNextPlayer(() => this.showTitle({ ...this.#session, playerName: '' }));
  }

  /** Updates the current state and the always-on scenery, then draws. */
  #advanceFrame(seconds) {
    this.#worldTime += seconds;
    this.#states.update(seconds);
    const { views, render } = this.#context;
    views.lighting.update(seconds);
    views.exitDoor.update(this.#worldTime);
    views.investigation.update();
    views.photography.update(seconds);
    render.render();
  }
}
