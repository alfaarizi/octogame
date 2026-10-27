import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { GAME_CONFIG } from '../src/config/gameConfig.js';
import { GameEvent } from '../src/core/GameEvent.js';
import { BATTERY_SPOTS, CANDY_SPOTS, EXIT_DOOR, GHOST_SPOTS, GHOST_START, OBSTACLES, PLAYER_START, TILE_ROWS } from '../src/data/officeLayout.js';
import { GhostState } from '../src/gameplay/hostiles/GhostState.js';
import { PickupKind } from '../src/gameplay/pickups/PickupField.js';
import { RoundOutcome } from '../src/gameplay/round/Round.js';
import { Simulation } from '../src/gameplay/Simulation.js';
import { SpawnTable } from '../src/world/SpawnTable.js';
import { TileMap } from '../src/world/TileMap.js';
import { recordingEventBus } from './helpers.js';

const STAND_STILL = Object.freeze({ intent: { forward: 0, strafe: 0, turn: 0, sprint: false }, look: { x: 0, y: 0 } });

describe('Simulation', () => {
  let simulation, recorder;

  beforeEach(() => {
    recorder = recordingEventBus();
    simulation = new Simulation({
      config: GAME_CONFIG,
      events: recorder.bus,
      tileMap: new TileMap(TILE_ROWS),
      spawnTable: new SpawnTable({ candySpots: CANDY_SPOTS, batterySpots: BATTERY_SPOTS, ghostSpots: GHOST_SPOTS }),
      layout: { playerStart: PLAYER_START, ghostStart: GHOST_START, exitDoor: EXIT_DOOR, obstacles: OBSTACLES },
    });
    simulation.startRound();
  });

  const standAt = ({ x, z }) => Object.assign(simulation.player.position, { x, z });

  test('the last candy opens the exit and enrages the ghost, and reaching the exit escapes', () => {
    for (const candy of simulation.pickups.items.filter((item) => item.kind === PickupKind.CANDY)) {
      standAt(candy.position);
      assert.equal(simulation.step(0.01, STAND_STILL), null);
    }
    assert.equal(simulation.round.candiesCollected, GAME_CONFIG.round.candiesRequired);
    assert.equal(simulation.exitDoor.isUnlocked, true);
    assert.equal(simulation.ghost.isEnraged, true);

    standAt({ x: EXIT_DOOR.centerX, z: EXIT_DOOR.trigger.minZ + 0.5 });
    assert.equal(simulation.step(0.01, STAND_STILL), RoundOutcome.ESCAPED);
    assert.equal(recorder.count(GameEvent.PLAYER_ESCAPED), 1);
  });

  test('the ghost touching the player ends the round as caught', () => {
    simulation.step(GAME_CONFIG.round.ghostGracePeriod, STAND_STILL);
    const { x, z } = simulation.player.position;
    simulation.ghost.reset({ x: x + 0.4, z }, 0);
    simulation.step(0.01, STAND_STILL);
    assert.equal(simulation.step(0.01, STAND_STILL), RoundOutcome.CAUGHT);
  });

  test('the beam freezes the ghost only while the player looks at it', () => {
    standAt({ x: 14, z: 12 });
    simulation.ghost.reset({ x: 14, z: 9 }, 0);
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
});
