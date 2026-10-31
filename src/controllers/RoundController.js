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
    simulation.startRound(this.#session);
    ui.pause.setNoHostiles(!simulation.hostilesEnabled);
    views.photography.reset();
    ui.album.updateChecklist(simulation.photography);
    views.ghost.hide();
    views.pickups.sync();
    views.firstPerson.update(0, simulation.player, simulation.player.movement);
    ui.hud.show();
    ui.pause.hide();
    input.clear();
    this.#subscriptions = [
      ...[
        [Action.USE_ITEM, () => this.#useItem()],
        [Action.TOGGLE_FLASHLIGHT, () => simulation.inventory.activeItem?.kind === 'flashlight' && simulation.actions.use()],
        [Action.INTERACT, () => simulation.actions.interact()],
        [Action.DROP_ITEM, () => simulation.actions.drop()],
        [Action.SLOT_ONE, () => simulation.actions.select(0)],
        [Action.SLOT_TWO, () => simulation.actions.select(1)],
        [Action.JOURNAL, () => pointerLock.release()],
      ].map(([action, handle]) => input.onPressed(action, () => {
        if (this.#isPaused || !pointerLock.isLocked) return;
        const look = input.consumeLookDelta();
        simulation.player.look(look.x, look.y);
        handle();
      })),
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
    views.firstPerson.update(seconds, player, simulation.movement);
    views.firstPerson.setHeldItem(simulation.office.isHidden ? null : simulation.inventory.activeItem?.kind);
    views.firstPerson.setBeamBrightness(flashlight.brightness);
    const { sight } = views.firstPerson;
    views.ghost.update(seconds, player.position);
    views.pickups.update();
    audio.updateSoundscape(seconds, { listener: sight, ghost, threatCloseness: threat.closeness });
    ui.hud.update({
      batteryCharge: flashlight.charge,
      batteryLow: flashlight.isLow,
      stamina: player.stamina,
      elapsed: round.elapsed,
      threatCloseness: threat.closeness,
      inventory: simulation.inventory,
      prompt: simulation.actions.prompt,
      hidden: simulation.office.isHidden,
      cameraTarget: simulation.photography.target(player.sight),
      noHostiles: !simulation.hostilesEnabled,
    });
  }

  #useItem() {
    const { simulation, views, ui } = this.#context;
    const photo = simulation.actions.use();
    if (!photo) return;
    views.firstPerson.update(0, simulation.player, simulation.movement);
    views.firstPerson.setBeamBrightness(simulation.flashlight.brightness);
    views.photography.capture(photo, simulation.photography.photos);
    ui.album.updateChecklist(simulation.photography);
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
