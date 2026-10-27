import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CollisionWorld } from '../src/world/CollisionWorld.js';
import { ExitDoor } from '../src/world/ExitDoor.js';
import { SpawnTable } from '../src/world/SpawnTable.js';
import { TileMap } from '../src/world/TileMap.js';
import { SMALL_ROOM } from './helpers.js';

describe('TileMap', () => {
  const map = new TileMap(SMALL_ROOM);

  test('floor is open; walls, the front door and outside the map are blocked', () => {
    assert.equal(map.isBlocked(1.5, 1.5), false);
    assert.equal(map.isBlocked(0.5, 0.5), true);
    assert.equal(map.isBlocked(4.5, 4.5), true, 'front door');
    assert.equal(map.isBlocked(-3, 1.5), true);
    assert.equal(map.isBlocked(1.5, 99), true);
  });

  test('line of sight is blocked by a wall between the points', () => {
    assert.equal(map.hasLineOfSight({ x: 1.5, z: 2.5 }, { x: 7.5, z: 2.5 }), false);
    assert.equal(map.hasLineOfSight({ x: 1.5, z: 1.5 }, { x: 7.5, z: 1.5 }), true);
  });

  test('rejects rows of different lengths', () => {
    assert.throws(() => new TileMap(['###', '##']));
  });
});

describe('CollisionWorld', () => {
  const map = new TileMap(SMALL_ROOM);

  test('pushes a body out of a wall', () => {
    const world = new CollisionWorld(map, []);
    // Radius 0.3 overlaps the west wall
    const position = { x: 1.1, z: 1.5 };
    world.resolveCircle(position, 0.3);
    assert.ok(Math.abs(position.x - 1.3) < 1e-9);
  });

  test('pushes a body out of furniture, even from inside it', () => {
    const world = new CollisionWorld(map, [{ x0: 2, z0: 1, x1: 3, z1: 2 }]);
    const position = { x: 2.9, z: 1.5 };
    world.resolveCircle(position, 0.3);
    assert.ok(position.x >= 3.3 - 1e-9, `expected to leave through the east side, got x=${position.x}`);
  });

  test('leaves a body in open floor alone', () => {
    const world = new CollisionWorld(map, []);
    const position = { x: 2.5, z: 1.5 };
    world.resolveCircle(position, 0.3);
    assert.deepEqual(position, { x: 2.5, z: 1.5 });
  });
});

describe('SpawnTable', () => {
  const candySpots = ['a', 'a', 'a', 'b', 'b', 'c'].map((room, i) => ({ room, x: i, y: 0, z: 0 }));
  const ghostSpots = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 20, z: 0 }];
  const table = new SpawnTable({ candySpots, batterySpots: candySpots, ghostSpots, maxCandiesPerRoom: 2 });

  test('never puts more than the allowed number of candies in one room', () => {
    for (let run = 0; run < 50; run++) {
      const rooms = table.pickCandySpots(5).map((spot) => spot.room);
      assert.equal(rooms.length, 5);
      assert.ok(rooms.filter((room) => room === 'a').length <= 2);
    }
  });

  test('respawns the ghost at one of the two spots farthest away', () => {
    for (let run = 0; run < 20; run++) {
      const spot = table.ghostSpotFarFrom({ x: 0, z: 0 });
      assert.ok(spot.x === 10 || spot.x === 20);
    }
  });
});

describe('ExitDoor', () => {
  test('only counts as reached once unlocked', () => {
    const door = new ExitDoor({ centerX: 14, trigger: { minZ: 16.9, halfWidth: 1.3 } });
    const atDoor = { x: 14, z: 17.5 };
    assert.equal(door.isReachedBy(atDoor), false);
    door.unlock();
    assert.equal(door.isReachedBy(atDoor), true);
    assert.equal(door.isReachedBy({ x: 10, z: 17.5 }), false);
  });
});
