import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Building } from '../src/models/world/Building.js';
import { CollisionWorld } from '../src/models/world/CollisionWorld.js';
import { ExitDoor } from '../src/models/world/ExitDoor.js';
import { SpawnTable } from '../src/models/world/SpawnTable.js';
import { TileMap } from '../src/models/world/TileMap.js';
import { Compass } from '../src/utils.js';
import { SMALL_ROOM } from './helpers.js';
import { OFFICE } from './office.js';

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

  test('a map with an origin covers only its own part of the grounds', () => {
    const shifted = new TileMap(SMALL_ROOM, 1, { x: 10, z: 20 });
    assert.equal(shifted.isBlocked(11.5, 21.5), false, 'its first floor tile');
    assert.equal(shifted.isBlocked(1.5, 1.5), true, 'where the unshifted map has floor');
    const rects = [];
    shifted.forEachTile((tile, rect) => tile === '.' && rects.push(rect));
    assert.deepEqual(rects[0], { x0: 11, z0: 21, x1: 12, z1: 22 });
  });

  test('openings in the floor block walking but not sight; stairs block neither', () => {
    const withOpenings = new TileMap(['########', '#.v*Ss.#', '########']);
    for (const x of [2.5, 3.5]) {
      assert.equal(withOpenings.isBlocked(x, 1.5), true);
      assert.equal(withOpenings.isOpaque(x, 1.5), false);
    }
    for (const x of [4.5, 5.5]) assert.equal(withOpenings.isBlocked(x, 1.5), false);
    assert.equal(withOpenings.hasLineOfSight({ x: 1.5, z: 1.5 }, { x: 6.5, z: 1.5 }), true);
  });

  test('a finer grid is measured in meters', () => {
    const fine = new TileMap(SMALL_ROOM, 0.5);
    assert.equal(fine.width, 4.5);
    assert.equal(fine.isBlocked(0.75, 0.75), false);
    assert.equal(fine.isBlocked(0.25, 0.75), true);
    assert.deepEqual(fine.blockingRectsAround({ x: 0.75, z: 0.75 }).length, 5);
  });

  test('rejects rows of different lengths', () => {
    assert.throws(() => new TileMap(['###', '##']));
  });
});

describe('CollisionWorld', () => {
  const map = new TileMap(SMALL_ROOM);

  test('pushes a body out of a wall', () => {
    const world = new CollisionWorld(map, []);
    // Radius 0.3 overlaps the west wall.
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

  test('extra obstacles count for one call only', () => {
    const world = new CollisionWorld(map, []);
    const position = { x: 2.9, z: 1.5 };
    world.resolveCircle(position, 0.3, [{ x0: 3, z0: 1, x1: 4, z1: 2 }]);
    assert.ok(Math.abs(position.x - 2.7) < 1e-9);
  });
});

describe('Building', () => {
  // A corridor whose stairs rise east from the ground floor to the floor above, which is open over the corridor's west end.
  const building = new Building(
    [
      { elevation: 0, tiles: ['########', '#..SS..#', '########'], obstacles: [], stairs: [
        { rect: { x0: 3, z0: 1, x1: 5, z1: 2 }, rises: Compass.EAST, low: 0, high: 3, rails: [] },
      ] },
      { elevation: 3, tiles: ['########', '#**SS..#', '########'], obstacles: [], stairs: [] },
    ],
    1,
  );
  const walk = (position, dx, steps) => {
    for (let i = 0; i < steps; i++) building.move(position, dx, 0, 0.3);
    return position;
  };

  test('climbs the stairs to the floor above, and back down', () => {
    const climber = walk({ x: 1.5, y: 0, z: 1.5 }, 0.05, 120);
    assert.deepEqual(climber, { x: 6.7, y: 3, z: 1.5 });
    walk(climber, -0.05, 120);
    assert.equal(climber.y, 0);
    assert.ok(Math.abs(climber.x - 1.3) < 1e-9);
  });

  test("can't step onto stairs that are far above or below", () => {
    const below = walk({ x: 6.5, y: 0, z: 1.5 }, -0.05, 40);
    assert.ok(Math.abs(below.x - 5.3) < 1e-9, `stopped at x=${below.x}`);
    const above = walk({ x: 3.5, y: 3, z: 1.5 }, 0, 1);
    assert.equal(above.y, 3, 'a body already up there stays up there');
  });

  test('walls and floors block the view; the same floor with nothing between does not', () => {
    assert.equal(building.hasLineOfSight({ x: 1.5, y: 0, z: 1.5 }, { x: 6.5, y: 0, z: 1.5 }), true);
    assert.equal(building.hasLineOfSight({ x: 1.5, y: 0, z: 1.5 }, { x: 6.5, y: 3, z: 1.5 }), false);
    assert.equal(building.isOpaque({ x: 0.5, y: 3, z: 1.5 }), true);
  });
});

describe('SpawnTable', () => {
  const batterySpots = ['a', 'a', 'a', 'b', 'b', 'c'].map((room, i) => ({ room, x: i, y: 0, z: 0 }));
  const ghostSpots = [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 0, y: 30, z: 0 }];
  const table = new SpawnTable({ batterySpots, ghostSpots });

  test('respawns the ghost at one of the two spots farthest away, counting height', () => {
    for (let run = 0; run < 20; run++) {
      const spot = table.ghostSpotFarFrom({ x: 0, y: 0, z: 0 });
      assert.ok(spot.x === 10 || spot.y === 30);
    }
  });
});

describe('ExitDoor', () => {
  test('only counts as reached once unlocked', () => {
    const door = new ExitDoor(OFFICE.exitDoor);
    const { centerX, trigger } = OFFICE.exitDoor;
    const atDoor = { x: centerX, z: trigger.minZ + 0.2 };
    assert.equal(door.isReachedBy(atDoor), false);
    door.unlock();
    assert.equal(door.isReachedBy(atDoor), true);
    assert.equal(door.isReachedBy({ ...atDoor, x: centerX - trigger.halfWidth - 1 }), false);
  });
});
