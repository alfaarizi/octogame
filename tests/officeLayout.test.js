import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONFIG } from '../src/config/gameConfig.js';
import {
  BATTERY_SPOTS,
  CANDY_SPOTS,
  EXIT_DOOR,
  GHOST_SPOTS,
  GHOST_START,
  OBSTACLES,
  PLAYER_START,
  TILE_ROWS,
  TILE_SIZE,
} from '../src/data/officeLayout.js';
import { planarDistance } from '../src/utils.js';
import { CollisionWorld } from '../src/world/CollisionWorld.js';
import { TileMap } from '../src/world/TileMap.js';

const STEP = 0.1;

/** Every point on a STEP grid the player can walk to from `start` without bumping into anything. */
function reachablePoints(map, collision, radius, start) {
  const key = (column, row) => `${column},${row}`;
  const fits = (column, row) => {
    const point = { x: column * STEP, z: row * STEP };
    if (map.isBlocked(point.x, point.z)) return false;
    collision.resolveCircle(point, radius);
    return Math.abs(point.x - column * STEP) < 1e-9 && Math.abs(point.z - row * STEP) < 1e-9;
  };
  const first = [Math.round(start.x / STEP), Math.round(start.z / STEP)];
  const seen = new Set([key(...first)]), queue = [first], points = [];
  while (queue.length > 0) {
    const [column, row] = queue.pop();
    points.push({ x: column * STEP, z: row * STEP });
    for (const [c, r] of [[column + 1, row], [column - 1, row], [column, row + 1], [column, row - 1]]) {
      if (!seen.has(key(c, r)) && fits(c, r)) {
        seen.add(key(c, r));
        queue.push([c, r]);
      }
    }
  }
  return points;
}

// Guards against level-design mistakes: things placed inside walls, or places you can't get to.
describe('office layout', () => {
  const map = new TileMap(TILE_ROWS, TILE_SIZE);
  const { collisionRadius, pickupRadius } = GAME_CONFIG.player;
  const reachable = reachablePoints(map, new CollisionWorld(map, OBSTACLES), collisionRadius, PLAYER_START);

  test('every spawn point is on a tile you can walk on', () => {
    for (const spot of [PLAYER_START, GHOST_START, ...CANDY_SPOTS, ...BATTERY_SPOTS, ...GHOST_SPOTS]) {
      assert.equal(map.isBlocked(spot.x, spot.z), false, `${JSON.stringify(spot)} is inside a wall`);
    }
  });

  test('there are enough candy spots for a round, two per room at most', () => {
    const rooms = new Set(CANDY_SPOTS.map((spot) => spot.room));
    assert.ok(rooms.size * 2 >= GAME_CONFIG.round.candiesRequired);
  });

  test('every candy and battery can be picked up by walking there from the start', () => {
    for (const spot of [...CANDY_SPOTS, ...BATTERY_SPOTS]) {
      assert.ok(reachable.some((point) => planarDistance(point, spot) < pickupRadius), `${JSON.stringify(spot)} can't be reached`);
    }
  });

  test('the player can walk up to the exit', () => {
    const { centerX, trigger } = EXIT_DOOR;
    assert.ok(reachable.some((point) => point.z > trigger.minZ && Math.abs(point.x - centerX) < trigger.halfWidth));
  });
});
