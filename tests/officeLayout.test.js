import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONFIG } from '../src/config/gameConfig.js';
import { CANDY_SPOTS, EXIT_DOOR, FLOORS, GHOST_START, PLAYER_START, TILE_SIZE } from '../src/data/officeLayout.js';
import { planarDistance } from '../src/utils.js';
import { Building } from '../src/world/Building.js';
import { StairFlight } from '../src/world/StairFlight.js';
import { Tile, TileMap } from '../src/world/TileMap.js';

const STEP = 0.1;

/** Every point on a STEP grid, on any floor, that the player can walk to from `start` without bumping into anything. */
function reachablePoints(building, radius, start) {
  const key = ({ x, y, z }) => `${Math.round(x / STEP)},${Math.round(z / STEP)},${Math.round(y * 100)}`;
  const first = { x: start.x, y: start.y, z: start.z };
  const seen = new Set([key(first)]), queue = [first];
  for (let index = 0; index < queue.length; index++) {
    const point = queue[index];
    for (const [dx, dz] of [[STEP, 0], [-STEP, 0], [0, STEP], [0, -STEP]]) {
      const next = { ...point };
      building.move(next, dx, dz, radius);
      const isUnhindered = Math.abs(next.x - point.x - dx) < 1e-9 && Math.abs(next.z - point.z - dz) < 1e-9;
      if (isUnhindered && !seen.has(key(next))) {
        seen.add(key(next));
        queue.push(next);
      }
    }
  }
  return queue;
}

// Guards against level-design mistakes: things placed inside walls, stairs that don't line up, or places you can't get to.
describe('office layout', () => {
  const { collisionRadius, pickupRadius, reachHeight } = GAME_CONFIG.player;
  const reachable = reachablePoints(new Building(FLOORS, TILE_SIZE), collisionRadius, PLAYER_START);
  const floorAt = (y) => FLOORS.findLast((floor) => floor.elevation <= y + 1e-9);

  test('every spawn point is on a tile you can walk on', () => {
    for (const spot of [PLAYER_START, GHOST_START, ...FLOORS.flatMap((floor) => [...floor.candySpots, ...floor.batterySpots, ...floor.ghostSpots])]) {
      const map = new TileMap(floorAt(spot.y).tiles, TILE_SIZE);
      assert.equal(map.isBlocked(spot.x, spot.z), false, `${JSON.stringify(spot)} is inside a wall`);
    }
  });

  test('stairs are stairs on the floor they rise from, and from halfway up on the floor above', () => {
    const isStairs = (tile) => tile === Tile.STAIRS || tile === Tile.OUTDOOR_STAIRS;
    FLOORS.slice(0, -1).forEach((floor, index) => {
      const [below, above] = [floor, FLOORS[index + 1]].map(({ tiles }) => new TileMap(tiles, TILE_SIZE));
      const halfway = (floor.elevation + FLOORS[index + 1].elevation) / 2;
      for (const plan of floor.stairs) {
        const { rect } = plan, flight = new StairFlight(plan);
        for (let x = rect.x0 + TILE_SIZE / 2; x < rect.x1; x += TILE_SIZE) {
          for (let z = rect.z0 + TILE_SIZE / 2; z < rect.z1; z += TILE_SIZE) {
            assert.ok(isStairs(below.tileAt(x, z)), `(${x}, ${z}) below`);
            if (flight.heightAt({ x, z }) >= halfway) assert.ok(isStairs(above.tileAt(x, z)), `(${x}, ${z}) above`);
          }
        }
      }
    });
  });

  test('there are enough candy spots for a round, two per room at most', () => {
    const rooms = new Set(CANDY_SPOTS.map((spot) => spot.room));
    assert.ok(rooms.size * 2 >= GAME_CONFIG.round.candiesRequired);
  });

  test('every floor can be reached by stairs from the start', () => {
    for (const { elevation } of FLOORS) assert.ok(reachable.some((point) => point.y === elevation), `the floor at ${elevation}`);
  });

  test('every candy and battery can be picked up by walking there from the start', () => {
    for (const spot of FLOORS.flatMap((floor) => [...floor.candySpots, ...floor.batterySpots])) {
      const isWithinReach = (point) => Math.abs(point.y - spot.y) < reachHeight && planarDistance(point, spot) < pickupRadius;
      assert.ok(reachable.some(isWithinReach), `${JSON.stringify(spot)} can't be reached`);
    }
  });

  test('the player can walk up to the exit', () => {
    const { centerX, trigger } = EXIT_DOOR;
    assert.ok(reachable.some((point) => point.y === 0 && point.z > trigger.minZ && Math.abs(point.x - centerX) < trigger.halfWidth));
  });
});
