import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { GAME_CONFIG } from '../src/config/gameConfig.js';
import { GameEvent } from '../src/core/GameEvent.js';
import { Ghost } from '../src/gameplay/hostiles/Ghost.js';
import { GhostState } from '../src/gameplay/hostiles/GhostState.js';
import { TileMap } from '../src/world/TileMap.js';

const config = GAME_CONFIG.ghost;
const OPEN_HALL = ['##############################', ...Array(6).fill('#............................#'), '##############################'];
const spawnTable = { randomGhostSpot: () => ({ x: 25, z: 3 }), ghostSpotFarFrom: () => ({ x: 27, z: 3 }) };

describe('Ghost', () => {
  let ghost, recorded;
  const world = (overrides = {}) => ({ playerPosition: { x: 2, z: 3 }, playerLightOn: false, isLit: false, candiesCollected: 0, ...overrides });

  beforeEach(() => {
    recorded = [];
    const events = { emit: (type) => recorded.push(type) };
    ghost = new Ghost({ config, tileMap: new TileMap(OPEN_HALL), spawnTable, events });
    ghost.reset({ x: 20, z: 3 }, 15);
  });

  test('sleeps through the grace period, then wakes', () => {
    ghost.update(14.9, world());
    assert.equal(ghost.state, GhostState.DORMANT);
    ghost.update(0.2, world());
    assert.equal(ghost.state, GhostState.WANDERING);
    assert.deepEqual(recorded, [GameEvent.GHOST_WOKE]);
  });

  test('freezes while lit and is banished after enough light', () => {
    ghost.update(15, world());
    ghost.update(0.5, world({ isLit: true }));
    assert.equal(ghost.state, GhostState.FROZEN);
    ghost.update(config.banishExposure, world({ isLit: true }));
    assert.equal(ghost.state, GhostState.BANISHED);
    assert.ok(recorded.includes(GameEvent.GHOST_BANISHED));
  });

  test("doesn't move while frozen", () => {
    ghost.update(15, world());
    ghost.update(0.1, world({ isLit: true }));
    const before = { ...ghost.position };
    ghost.update(0.5, world({ isLit: true }));
    assert.deepEqual(ghost.position, before);
  });

  test('spots a lit flashlight from afar and hunts', () => {
    ghost.update(15, world());
    ghost.update(0.1, world({ playerPosition: { x: 10, z: 3 }, playerLightOn: true }));
    assert.equal(ghost.state, GhostState.HUNTING);
    assert.ok(recorded.includes(GameEvent.GHOST_SPOTTED_PLAYER));
  });

  test("doesn't notice a dark player who's far away", () => {
    ghost.update(15, world());
    ghost.update(0.1, world({ playerPosition: { x: 2, z: 3 }, playerLightOn: false }));
    assert.equal(ghost.state, GhostState.WANDERING);
  });

  test('catches the player on contact', () => {
    ghost.update(15, world());
    ghost.update(0.1, world({ playerPosition: { x: 20.5, z: 3 } }));
    assert.ok(recorded.includes(GameEvent.PLAYER_CAUGHT));
  });

  test('hunts faster with each candy collected, fastest when enraged', () => {
    const distanceAfterOneSecond = (setup) => {
      ghost.reset({ x: 20, z: 3 }, 0);
      ghost.update(0, world());
      setup();
      ghost.update(1, world({ playerPosition: { x: 10, z: 3 }, playerLightOn: true, candiesCollected: 3 }));
      return 20 - ghost.position.x;
    };
    const hunting = distanceAfterOneSecond(() => {});
    const enraged = distanceAfterOneSecond(() => ghost.enrage());
    assert.ok(Math.abs(hunting - (config.huntSpeed + 3 * config.huntSpeedPerCandy)) < 1e-9);
    assert.ok(Math.abs(enraged - config.enragedSpeed) < 1e-9);
  });

  test('respawns far from the player after being banished', () => {
    ghost.update(15, world());
    ghost.update(config.banishExposure + 0.1, world({ isLit: true }));
    ghost.update(config.respawnDelay + 0.1, world());
    assert.equal(ghost.state, GhostState.WANDERING);
    assert.deepEqual(ghost.position, { x: 27, z: 3 });
  });
});
