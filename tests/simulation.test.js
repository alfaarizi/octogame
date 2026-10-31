import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { GAME_CONFIG } from '../src/config/gameConfig.js';
import { GameEvent } from '../src/core/GameEvent.js';
import { GhostState } from '../src/models/hostiles/GhostState.js';
import { PickupKind } from '../src/models/pickups/PickupField.js';
import { RoundOutcome } from '../src/models/round/Round.js';
import { Simulation } from '../src/models/Simulation.js';
import { Building } from '../src/models/world/Building.js';
import { SpawnTable } from '../src/models/world/SpawnTable.js';
import { recordingEventBus } from './helpers.js';
import { OFFICE } from './office.js';

const STAND_STILL = Object.freeze({ intent: { forward: 0, strafe: 0, turn: 0, sprint: false }, look: { x: 0, y: 0 } });

describe('Simulation', () => {
  let simulation, recorder;

  beforeEach(() => {
    recorder = recordingEventBus();
    simulation = new Simulation({
      config: GAME_CONFIG,
      events: recorder.bus,
      building: new Building(OFFICE.floors, OFFICE.tileSize),
      spawnTable: new SpawnTable({ evidenceSpots: OFFICE.evidenceSpots, batterySpots: OFFICE.batterySpots, ghostSpots: OFFICE.ghostSpots }),
      layout: OFFICE,
    });
    simulation.startRound();
  });

  const standAt = ({ x, y, z }) => Object.assign(simulation.player.position, { x, y, z });

  const aimAt = (target) => {
    const origin = simulation.player.sight.origin;
    const dx = target.x - origin.x, dy = target.y - origin.y, dz = target.z - origin.z;
    simulation.player.yaw = Math.atan2(-dx, -dz);
    simulation.player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  };

  test('starts empty-handed, requires E, and stowing the flashlight stops drain and light', () => {
    assert.equal(simulation.inventory.activeItem, null);
    assert.equal(simulation.flashlight.isEmitting, false);
    const torch = simulation.pickups.items.find(item => item.kind === 'flashlight');
    aimAt(torch.position);
    simulation.step(.01, STAND_STILL);
    assert.equal(simulation.inventory.activeItem, null);
    simulation.actions.interact();
    assert.equal(simulation.inventory.activeItem?.kind, 'flashlight');
    assert.equal(simulation.flashlight.isEmitting, true);
    simulation.actions.select(1);
    const charge = simulation.flashlight.charge;
    simulation.step(1, STAND_STILL);
    assert.equal(simulation.flashlight.charge, charge);
    assert.equal(simulation.flashlight.isEmitting, false);
  });

  test('five distinct photos unlock and enrage; duplicates do not score; the exit completes the round', () => {
    simulation.inventory.pickUp({ id: 99, kind: 'camera' });
    const approaches = {
      drawing: { x: 16.2, y: -3, z: 4.4 }, handprint: { x: 3.03, y: 0, z: 2.1 },
      phone: { x: 16.2, y: 0, z: 8.1 }, clock: { x: 11.8, y: 3, z: 6.5 },
      visitor: { x: 19.2, y: 0, z: 20.5 },
    };
    for (const subject of OFFICE.evidenceSpots) {
      standAt(approaches[subject.id]);
      aimAt(subject);
      const before = simulation.round.evidenceCollected;
      assert.equal(simulation.actions.use()?.isNewEvidence, true, subject.name);
      simulation.round.tick(2);
      assert.equal(simulation.actions.use()?.isNewEvidence, false);
      assert.equal(simulation.round.evidenceCollected, before + 1);
      simulation.round.tick(2);
    }
    assert.equal(simulation.exitDoor.isUnlocked, true);
    assert.equal(simulation.ghost.isEnraged, true);
    standAt({ x: OFFICE.exitDoor.centerX, y: 0, z: OFFICE.exitDoor.trigger.minZ + .5 });
    assert.equal(simulation.step(.01, STAND_STILL), RoundOutcome.ESCAPED);
    assert.equal(recorder.count(GameEvent.PLAYER_ESCAPED), 1);
  });

  test('the ghost touching the player ends the round as caught', () => {
    simulation.step(GAME_CONFIG.round.ghostGracePeriod, STAND_STILL);
    const { x, y, z } = simulation.player.position;
    simulation.ghost.reset({ x: x + 0.4, y, z }, 0);
    simulation.step(0.01, STAND_STILL);
    assert.equal(simulation.step(0.01, STAND_STILL), RoundOutcome.CAUGHT);
  });

  test('the beam freezes the ghost only while the player looks at it', () => {
    simulation.inventory.pickUp({ id: 99, kind: 'flashlight' });
    standAt({ x: 16, y: 0, z: 8.5 });
    simulation.ghost.reset({ x: 16, y: 0, z: 5.5 }, 0);
    simulation.step(0.01, STAND_STILL);
    simulation.step(0.01, STAND_STILL);
    assert.equal(simulation.ghost.state, GhostState.FROZEN);

    simulation.player.yaw = Math.PI;
    simulation.step(0.01, STAND_STILL);
    assert.notEqual(simulation.ghost.state, GhostState.FROZEN);
  });

  test('clearing empties the office and relocks the exit', () => {
    simulation.exitDoor.unlock();
    simulation.clear();
    assert.equal(simulation.pickups.items.length, 0);
    assert.equal(simulation.exitDoor.isUnlocked, false);
    assert.equal(simulation.ghost.isPresent, false);
  });

  test('no-hostiles mode prevents waking, camera aggression, enrage and catches', () => {
    simulation.startRound({ noHostiles: true });
    assert.equal(simulation.hostilesEnabled, false);
    assert.equal(simulation.isPracticeRound, true);
    assert.equal(simulation.step(120, STAND_STILL), null);
    simulation.ghost.hearCamera(simulation.player.position, 100);
    for (let i = 0; i < GAME_CONFIG.round.evidenceRequired; i++) simulation.round.recordEvidence();
    recorder.bus.emit(GameEvent.PLAYER_CAUGHT);
    assert.equal(simulation.step(120, STAND_STILL), null);
    assert.equal(simulation.ghost.isPresent, false);
    assert.equal(simulation.ghost.isEnraged, false);
    assert.equal(simulation.threat.closeness, 0);
  });

  test('toggling off removes an active ghost immediately; re-enabling keeps the round unranked', () => {
    simulation.ghost.reset(simulation.player.position, 0);
    simulation.step(.01, STAND_STILL);
    assert.equal(simulation.ghost.isPresent, true);
    simulation.setHostilesEnabled(false);
    assert.equal(simulation.ghost.isPresent, false);
    assert.equal(simulation.step(3, STAND_STILL), null);
    simulation.setHostilesEnabled(true);
    assert.equal(simulation.hostilesEnabled, true);
    assert.equal(simulation.ghost.isPresent, false);
    assert.equal(simulation.isPracticeRound, true);
    simulation.startRound();
    assert.equal(simulation.isPracticeRound, false);
  });

  test('full inventory leaves an item on the ground; using a battery consumes only that pack', () => {
    simulation.inventory.pickUp({ id: 90, kind: 'flashlight' });
    simulation.inventory.pickUp({ id: 91, kind: 'battery' });
    aimAt(simulation.pickups.items.find(item => item.kind === 'camera').position);
    const count = simulation.pickups.items.length;
    simulation.actions.interact();
    assert.equal(simulation.pickups.items.length, count);
    simulation.actions.syncEquipment();
    simulation.flashlight.update(30, 30, 0);
    simulation.actions.select(1);
    simulation.actions.use();
    assert.equal(simulation.inventory.activeItem, null);
    assert.equal(simulation.inventory.has('flashlight'), true);
    assert.equal(simulation.flashlight.charge, .9);
  });
});
