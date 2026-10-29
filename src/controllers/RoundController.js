import { GameEvent } from '../core/GameEvent.js';
import { RoundOutcome } from '../models/round/Round.js';
import { Action } from './input/keyBindings.js';

/** @typedef {import('../types.js').Session} Session */

/**
 * A round in progress. Each frame it feeds the player's input to the simulation, then updates what
 * the player sees and hears. It pauses while the mouse is released and hands over when the round ends.
 */
export class RoundController {
  #context;
  #game;
  #session;
  #subscriptions = [];
  #isPaused = false;

  /**
   * @param {object} context - The objects built by createGameContext().
   * @param {import('./GameController.js').GameController} game - Asked to move on via showJumpScare() or showResult().
   * @param {Session} session - The current player's choices.
   */
  constructor(context, game, session) {
    this.#context = context;
    this.#game = game;
    this.#session = session;
  }

  enter() {
    const { audio, input, pointerLock, simulation, ui, views } = this.#context;
    // Audio can start here because this runs inside the click or key press that started the round.
    audio.start();
    simulation.startRound();
    views.ghost.hide();
    views.pickups.sync();
    views.firstPerson.update(0, simulation.player, simulation.player.movement);
    ui.hud.show();
    ui.pause.hide();
    input.clear();
    this.#subscriptions = [
      input.onPressed(Action.TOGGLE_FLASHLIGHT, () => !this.#isPaused && simulation.flashlight.toggle()),
      pointerLock.onChange((isLocked) => this.#setPaused(!isLocked)),
    ];
    pointerLock.request();
  }

  exit() {
    for (const unsubscribe of this.#subscriptions) unsubscribe();
    this.#subscriptions = [];
    this.#context.ui.pause.hide();
    this.#context.events.emit(GameEvent.ROUND_ENDED);
  }

  update(seconds) {
    if (this.#isPaused) return;
    const { input, simulation } = this.#context;
    const outcome = simulation.step(seconds, { intent: input.readMovementIntent(), look: input.consumeLookDelta() });
    if (outcome) this.#endRound(outcome);
    else this.#present(seconds);
  }

  /** Brings the view, sound and HUD in line with the simulation. */
  #present(seconds) {
    const { audio, simulation, ui, views } = this.#context;
    const { flashlight, ghost, player, round, threat } = simulation;
    views.firstPerson.update(seconds, player, player.movement);
    views.firstPerson.setBeamBrightness(flashlight.brightness);
    const { sight } = views.firstPerson;
    views.ghost.update(seconds, player.position);
    views.pickups.update(seconds, round.elapsed, flashlight.isEmitting ? sight : null);
    audio.updateSoundscape(seconds, { listener: sight, ghost, threatCloseness: threat.closeness });
    ui.hud.update({
      batteryCharge: flashlight.charge,
      batteryLow: flashlight.isLow,
      stamina: player.stamina,
      elapsed: round.elapsed,
      threatCloseness: threat.closeness,
    });
  }

  #endRound(outcome) {
    if (outcome === RoundOutcome.CAUGHT) this.#game.showJumpScare();
    else this.#game.showResult(this.#context.simulation.round.summarize(this.#session.playerName, outcome));
  }

  #setPaused(isPaused) {
    if (isPaused === this.#isPaused) return;
    this.#isPaused = isPaused;
    const { events, input, ui } = this.#context;
    if (isPaused) ui.pause.show();
    else ui.pause.hide();
    input.clear();
    events.emit(isPaused ? GameEvent.GAME_PAUSED : GameEvent.GAME_RESUMED);
  }
}
