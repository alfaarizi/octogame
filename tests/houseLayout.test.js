import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONFIG } from '../src/config/gameConfig.js';
import {
  BATTERY_SPOTS,
  CANDY_SPOTS,
  GHOST_SPOTS,
  GHOST_START,
  OBSTACLES,
  PLAYER_START,
  TILE_ROWS,
} from '../src/data/houseLayout.js';
import { planarDistance, pointAlongHeading } from '../src/utils.js';
import { CollisionWorld } from '../src/world/CollisionWorld.js';
import { TileMap } from '../src/world/TileMap.js';

// Guards against level-design mistakes: things placed inside walls, or candy you can't reach.
describe('house layout', () => {
  const map = new TileMap(TILE_ROWS);
  const collision = new CollisionWorld(map, OBSTACLES);
  const { collisionRadius, pickupRadius } = GAME_CONFIG.player;

  test('every spawn point is on a floor tile', () => {
    for (const spot of [PLAYER_START, GHOST_START, ...CANDY_SPOTS, ...BATTERY_SPOTS, ...GHOST_SPOTS]) {
      assert.equal(map.isBlocked(spot.x, spot.z), false, `${JSON.stringify(spot)} is inside a wall`);
    }
  });

  test('there are enough candy spots for a round, two per room at most', () => {
    const rooms = new Set(CANDY_SPOTS.map((spot) => spot.room));
    assert.ok(rooms.size * 2 >= GAME_CONFIG.round.candiesRequired);
  });

  test('every candy and battery can be picked up from somewhere the player can stand', () => {
    for (const spot of [...CANDY_SPOTS, ...BATTERY_SPOTS]) {
      const reachable = [0, 1, 2, 3, 4, 5, 6, 7].some((step) => {
        const angle = (step / 8) * Math.PI * 2;
        const standAt = pointAlongHeading(spot, angle, pickupRadius * 0.9);
        if (map.isBlocked(standAt.x, standAt.z)) return false;
        const pushed = { ...standAt };
        collision.resolveCircle(pushed, collisionRadius);
        return planarDistance(pushed, spot) < pickupRadius;
      });
      assert.ok(reachable, `${JSON.stringify(spot)} can't be reached`);
    }
  });
});
