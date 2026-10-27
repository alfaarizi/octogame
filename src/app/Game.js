import { GameLoop } from '../core/GameLoop.js';
import { crashReporter } from './crashReporter.js';
import { StateMachine } from './StateMachine.js';
import { CaughtState } from './states/CaughtState.js';
import { PlayingState } from './states/PlayingState.js';
import { ResultState } from './states/ResultState.js';
import { TitleState } from './states/TitleState.js';

/**
 * The top level. Owns the frame loop and the state machine, and moves between
 * title → playing → (caught) → result → playing again or title. States call back here to move on.
 */
export class Game {
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

  /** @param prefill { playerName, chickenMode } to put in the form */
  showTitle(prefill) {
    this.#states.transition(new TitleState(this.#context, prefill));
  }

  /** @param session { playerName, chickenMode }, kept for "Play again" */
  startRound(session) {
    this.#session = session;
    this.#states.transition(new PlayingState(this.#context, this, session));
  }

  showJumpScare() {
    this.#states.transition(new CaughtState(this.#context, this, this.#session));
  }

  /** @param result RoundResult */
  showResult(result) {
    this.#states.transition(new ResultState(this.#context, result));
  }

  #connectMenus() {
    const { ui, persistence, pointerLock } = this.#context;
    ui.title.onStart((session) => {
      persistence.preferences.save(session);
      this.startRound(session);
    });
    ui.pause.onResume(() => pointerLock.request());
    ui.pause.onQuit(() => this.showTitle(persistence.preferences.load()));
    ui.result.onPlayAgain(() => this.startRound(this.#session));
    ui.result.onNextPlayer(() => this.showTitle({ playerName: '', chickenMode: this.#session.chickenMode }));
  }

  /** Updates the current state and the always-on scenery, then draws. */
  #advanceFrame(seconds) {
    this.#worldTime += seconds;
    this.#states.update(seconds);
    const { views, render } = this.#context;
    views.lighting.update(seconds, this.#worldTime);
    views.exitDoor.update(this.#worldTime);
    render.render();
  }
}
