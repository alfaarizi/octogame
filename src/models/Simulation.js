import { GameEvent } from '../core/GameEvent.js';
import { above, distanceBetween, isWithinCone } from '../utils.js';
import { AmbientNoiseCue } from './cues/AmbientNoiseCue.js';
import { FootstepCue } from './cues/FootstepCue.js';
import { Ghost } from './hostiles/Ghost.js';
import { measureThreat, NO_THREAT } from './hostiles/threat.js';
import { InteractionTargeting } from './interaction/InteractionTargeting.js';
import { OfficeInteractions } from './interaction/OfficeInteractions.js';
import { PlayerActions } from './interaction/PlayerActions.js';
import { Photography } from './investigation/Photography.js';
import { PickupField } from './pickups/PickupField.js';
import { Flashlight } from './player/Flashlight.js';
import { Inventory } from './player/Inventory.js';
import { Player, STANDING_STILL } from './player/Player.js';
import { Round, RoundOutcome } from './round/Round.js';
import { ExitDoor } from './world/ExitDoor.js';

/** The frame-level coordinator. Models own rules; events carry presentation requests to views. */
export class Simulation {
  #config;
  #events;
  #building;
  #spawnTable;
  #layout;
  #footsteps;
  #ambientNoise;
  #outcome = null;
  #threat = NO_THREAT;
  #hostilesEnabled = true;
  #isPracticeRound = false;

  constructor({ config, events, building, spawnTable, layout }) {
    this.#config = config;
    this.#events = events;
    this.#building = building;
    this.#spawnTable = spawnTable;
    this.#layout = layout;
    this.exitDoor = new ExitDoor(layout.exitDoor);
    this.round = new Round({ events, exitDoor: this.exitDoor, evidenceRequired: config.round.evidenceRequired });
    this.player = new Player(config.player, building);
    this.flashlight = new Flashlight(config.flashlight, events);
    this.ghost = new Ghost({ config: config.ghost, building, spawnTable, events });
    this.pickups = new PickupField();
    this.inventory = new Inventory();
    this.office = new OfficeInteractions(layout.interactables);
    this.photography = new Photography(config.camera, building, layout.evidenceSpots ?? []);
    this.actions = new PlayerActions({
      player: this.player, inventory: this.inventory, pickups: this.pickups, flashlight: this.flashlight,
      photography: this.photography, office: this.office, ghost: this.ghost, round: this.round,
      targeting: new InteractionTargeting(building, config.interaction), building, events, config,
    });
    this.#footsteps = new FootstepCue(events, config.player);
    this.#ambientNoise = new AmbientNoiseCue(events, config.round);
    events.on(GameEvent.EXIT_UNLOCKED, () => { if (this.#hostilesEnabled) this.ghost.enrage(); });
    events.on(GameEvent.PLAYER_CAUGHT, () => { if (this.#hostilesEnabled) this.#outcome ??= RoundOutcome.CAUGHT; });
  }

  get threat() { return this.#threat; }
  get movement() { return this.office.isHidden ? STANDING_STILL : this.player.movement; }
  get hostilesEnabled() { return this.#hostilesEnabled; }
  get isPracticeRound() { return this.#isPracticeRound; }

  /** Development switch. Re-enabling gives a fresh grace period; the round stays unranked. */
  setHostilesEnabled(enabled) {
    if (enabled === this.#hostilesEnabled) return;
    this.#hostilesEnabled = enabled;
    this.#threat = NO_THREAT;
    if (!enabled) {
      this.#isPracticeRound = true;
      this.ghost.deactivate();
    } else {
      this.ghost.reset(this.#spawnTable.ghostSpotFarFrom(this.player.position), this.#config.round.ghostGracePeriod);
      if (this.exitDoor.isUnlocked) this.ghost.enrage();
    }
  }

  startRound({ noHostiles = false } = {}) {
    this.#outcome = null;
    this.#threat = NO_THREAT;
    this.#hostilesEnabled = !noHostiles;
    this.#isPracticeRound = noHostiles;
    this.inventory.reset();
    this.office.reset();
    this.photography.reset();
    this.round.start();
    this.pickups.populate({ equipment: this.#layout.equipment ?? [],
      batterySpots: this.#spawnTable.pickBatterySpots(this.#config.round.batteriesPlaced) });
    this.player.respawn(this.#layout.playerStart);
    this.flashlight.reset();
    this.actions.syncEquipment();
    this.ghost.reset(this.#layout.ghostStart, this.#config.round.ghostGracePeriod);
    if (noHostiles) this.ghost.deactivate();
    this.#footsteps.reset();
    this.#ambientNoise.reset();
  }

  endRound() { this.ghost.deactivate(); }

  clear() {
    this.endRound();
    this.pickups.clear();
    this.inventory.reset();
    this.office.reset();
    this.actions.syncEquipment();
    this.exitDoor.lock();
  }

  step(seconds, { intent, look }) {
    if (this.#outcome) return this.#outcome;
    const { round, player, flashlight, ghost } = this;
    round.tick(seconds);
    player.look(look.x, look.y);
    if (!this.office.isHidden) this.#footsteps.update(seconds, player.update(seconds, intent));
    this.#threat = ghost.isPresent ? measureThreat(distanceBetween(ghost.position, player.position), this.#config.ghost) : NO_THREAT;
    this.actions.syncEquipment();
    flashlight.update(seconds, round.elapsed, this.#threat.interference);
    if (this.#hostilesEnabled) ghost.update(seconds, {
      playerPosition: player.position,
      playerLightOn: flashlight.isEmitting,
      playerConcealed: this.office.isConcealed,
      isLit: this.#isGhostLit(),
      evidenceCollected: round.evidenceCollected,
    });
    if (this.#outcome) return this.#outcome;
    if (this.exitDoor.isReachedBy(player.position)) {
      this.#outcome = RoundOutcome.ESCAPED;
      this.#events.emit(GameEvent.PLAYER_ESCAPED);
      return this.#outcome;
    }
    this.#ambientNoise.update(seconds, player.position);
    return null;
  }

  #isGhostLit() {
    const { player, ghost } = this;
    if (!this.flashlight.isEmitting || !ghost.isPresent) return false;
    const target = above(ghost.position, this.#config.ghost.bodyCenterHeight);
    return isWithinCone(player.sight, this.#config.flashlight.freezeCone, target, this.#config.ghost.bodyRadius)
      && this.#building.hasClearRay(player.sight.origin, target);
  }
}
