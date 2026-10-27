import { GameEvent } from '../../core/GameEvent.js';
import { GhostState } from '../../gameplay/hostiles/GhostState.js';
import { measureThreat, NO_THREAT } from '../../gameplay/hostiles/threat.js';
import { PickupKind } from '../../gameplay/pickups/PickupField.js';
import { RoundOutcome } from '../../gameplay/round/Round.js';
import { Action } from '../../input/keyBindings.js';
import { planarDistance } from '../../utils.js';

/**
 * A round in progress. Each frame it advances the simulation, then updates what the player
 * sees and hears. It pauses while the mouse is released and hands over when the round ends.
 */
export class PlayingState {
  #context;
  #game;
  #session;
  #subscriptions = [];
  #isPaused = false;
  #outcome = null;
  #threat = NO_THREAT;

  /**
   * @param {object} context - The objects built by createGameContext().
   * @param {import('../Game.js').Game} game - Asked to move on via showJumpScare() or showResult().
   * @param {{ playerName: string, chickenMode: boolean }} session - The current player's choices.
   */
  constructor(context, game, session) {
    this.#context = context;
    this.#game = game;
    this.#session = session;
  }

  enter() {
    const { audio, events, input, pointerLock, ui, world } = this.#context;
    // Audio can start here because this runs inside the click or key press that started the round.
    audio.start();
    this.#setUpRound();
    ui.hud.show();
    ui.pause.hide();
    input.clear();
    this.#subscriptions = [
      events.on(GameEvent.EXIT_UNLOCKED, () => world.ghost.enrage()),
      events.on(GameEvent.PLAYER_CAUGHT, () => (this.#outcome ??= RoundOutcome.CAUGHT)),
      input.onPressed(Action.TOGGLE_FLASHLIGHT, () => !this.#isPaused && world.flashlight.toggle()),
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
    this.#simulate(seconds);
    if (this.#outcome) {
      this.#endRound();
      return;
    }
    this.#present(seconds);
  }

  #setUpRound() {
    const { config, layout, spawnTable, views, world } = this.#context;
    world.round.start();
    world.pickups.populate({
      candySpots: spawnTable.pickCandySpots(config.round.candiesRequired),
      batterySpots: spawnTable.pickBatterySpots(config.round.batteriesPlaced),
    });
    world.player.respawn(layout.playerStart);
    world.flashlight.reset();
    world.ghost.reset(layout.ghostStart, config.round.ghostGracePeriod);
    for (const cue of [world.footstepCue, world.candyNearbyCue, world.ambientNoiseCue]) cue.reset();
    views.ghost.hide();
    views.pickups.sync();
    views.firstPerson.update(0, world.player, world.player.movement);
  }

  #simulate(seconds) {
    const { config, input, views, world } = this.#context;
    const { round, player, flashlight, ghost, pickups, exitDoor } = world;
    round.tick(seconds);

    const look = input.consumeLookDelta();
    player.look(look.x, look.y);
    const movement = player.update(seconds, input.readMovementIntent());
    world.footstepCue.update(seconds, movement);
    // The beam check below needs the camera where the player now is.
    views.firstPerson.update(seconds, player, movement);

    this.#threat = ghost.isPresent ? measureThreat(planarDistance(ghost.position, player.position), config.ghost) : NO_THREAT;
    flashlight.update(seconds, round.elapsed, this.#threat.interference);
    ghost.update(seconds, {
      playerPosition: player.position,
      playerLightOn: flashlight.isEmitting,
      isLit: this.#isGhostLit(),
      candiesCollected: round.candiesCollected,
    });
    if (this.#outcome) return;

    this.#collectPickups();
    if (exitDoor.isReachedBy(player.position)) {
      this.#outcome = RoundOutcome.ESCAPED;
      return;
    }

    world.candyNearbyCue.update(seconds, pickups.nearest(PickupKind.CANDY, player.position));
    world.ambientNoiseCue.update(seconds, player.position);
  }

  #isGhostLit() {
    const { config, views, world } = this.#context;
    const { ghost, flashlight, beam } = world;
    if (!flashlight.isEmitting || !ghost.isPresent) return false;
    const bodyCenter = { x: ghost.position.x, y: config.ghost.bodyCenterHeight, z: ghost.position.z };
    return beam.illuminates(views.firstPerson.eye, views.firstPerson.viewDirection, bodyCenter, config.ghost.bodyRadius);
  }

  #collectPickups() {
    const { config, events, world } = this.#context;
    for (const item of world.pickups.collectWithinReach(world.player.position)) {
      if (item.kind === PickupKind.CANDY) {
        world.round.recordCandy();
      } else {
        world.flashlight.recharge(config.flashlight.batteryPickupCharge);
        events.emit(GameEvent.BATTERY_COLLECTED);
      }
    }
  }

  #present(seconds) {
    const { audio, ui, views, world } = this.#context;
    const { flashlight, ghost, player, round } = world;
    const { eye, viewDirection } = views.firstPerson;
    views.firstPerson.setBeamBrightness(flashlight.brightness);
    views.ghost.update(seconds, player.position);
    views.pickups.update(seconds, round.elapsed, { eye, direction: viewDirection, isOn: flashlight.isEmitting });
    audio.updateSoundscape(seconds, {
      listener: { position: eye, direction: viewDirection },
      ghost: {
        position: ghost.position,
        isPresent: ghost.isPresent,
        isHunting: ghost.state === GhostState.HUNTING,
        isFrozen: ghost.state === GhostState.FROZEN,
      },
      threatCloseness: this.#threat.closeness,
    });
    ui.hud.update({
      batteryCharge: flashlight.charge,
      batteryLow: flashlight.isLow,
      stamina: player.stamina,
      elapsed: round.elapsed,
      threatCloseness: this.#threat.closeness,
    });
  }

  #endRound() {
    if (this.#outcome === RoundOutcome.CAUGHT) {
      this.#game.showJumpScare();
      return;
    }
    this.#context.events.emit(GameEvent.PLAYER_ESCAPED);
    this.#game.showResult(this.#context.world.round.summarize(this.#session.playerName, RoundOutcome.ESCAPED));
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
