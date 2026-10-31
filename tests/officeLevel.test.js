import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONFIG } from '../src/config/gameConfig.js';
import { ITEM_RESTING_HEIGHT } from '../src/models/player/Inventory.js';
import { Building } from '../src/models/world/Building.js';
import { StairFlight } from '../src/models/world/StairFlight.js';
import { Tile } from '../src/models/world/TileMap.js';
import { planarDistance } from '../src/utils.js';
import { OFFICE } from './office.js';

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
  const building = new Building(OFFICE.floors, OFFICE.tileSize);
  const reachable = reachablePoints(building, collisionRadius, OFFICE.playerStart);
  const tileMapAt = (y) => building.tileMaps[OFFICE.floors.findLastIndex((floor) => floor.elevation <= y + 1e-9)];

  test('every spawn point is on a tile you can walk on', () => {
    for (const spot of [OFFICE.playerStart, OFFICE.ghostStart, ...OFFICE.floors.flatMap((floor) => [...floor.evidenceSpots, ...floor.batterySpots, ...floor.ghostSpots])]) {
      assert.equal(tileMapAt(spot.y).isBlocked(spot.x, spot.z), false, `${JSON.stringify(spot)} is inside a wall`);
    }
  });

  test('stairs are stairs on the floor they rise from, and from halfway up on the floor above', () => {
    const isStairs = (tile) => tile === Tile.STAIRS || tile === Tile.OUTDOOR_STAIRS;
    OFFICE.floors.slice(0, -1).forEach((floor, index) => {
      const [below, above] = [building.tileMaps[index], building.tileMaps[index + 1]];
      const halfway = (floor.elevation + OFFICE.floors[index + 1].elevation) / 2;
      for (const plan of floor.stairs) {
        const { rect } = plan, flight = new StairFlight(plan);
        for (let x = rect.x0 + OFFICE.tileSize / 2; x < rect.x1; x += OFFICE.tileSize) {
          for (let z = rect.z0 + OFFICE.tileSize / 2; z < rect.z1; z += OFFICE.tileSize) {
            assert.ok(isStairs(below.tileAt(x, z)), `(${x}, ${z}) below`);
            if (flight.heightAt({ x, z }) >= halfway) assert.ok(isStairs(above.tileAt(x, z)), `(${x}, ${z}) above`);
          }
        }
      }
    });
  });

  test('dropped equipment rests on a visible stair tread', () => {
    const plan = OFFICE.floors.find((floor) => floor.name === 'ground floor').stairs[0];
    const flight = new StairFlight(plan);
    const point = { x: (plan.rect.x0 + plan.rect.x1) / 2, z: (plan.rect.z0 + plan.rect.z1) / 2 };
    const dropped = building.dropPosition({ ...point, y: flight.heightAt(point) }, 0, 0, collisionRadius);
    assert.equal(dropped.y, flight.treadHeightAt(point));
    assert.ok(dropped.y >= flight.heightAt(point));
  });

  test('the authored evidence matches the objective count', () => {
    assert.equal(OFFICE.evidenceSpots.length, GAME_CONFIG.round.evidenceRequired);
  });

  test('each crime scene subject rests on its authored floor or furniture', () => {
    const baseBelowTarget = { handprint: .004, phone: .13, drawing: .004, clock: .23, silhouette: 1.05 };
    for (const floor of OFFICE.floors) for (const subject of floor.evidenceSpots) {
      const baseY = subject.y - baseBelowTarget[subject.kind];
      if (subject.kind === 'silhouette') {
        assert.ok(Math.abs(baseY - floor.elevation) < .03, `${subject.id} is above the ground`);
        continue;
      }
      const support = floor.furniture.flatMap((piece) => piece.parts).some((part) =>
        subject.x > part.x0 && subject.x < part.x1 && subject.z > part.z0 && subject.z < part.z1
        && Math.abs(part.y1 - baseY) < .03);
      assert.ok(support, `${subject.id} has no furniture beneath it`);
    }
  });

  test('loose batteries and starting equipment rest on their supporting surfaces', () => {
    for (const floor of OFFICE.floors) {
      for (const battery of floor.batterySpots) {
        assert.ok(Math.abs(battery.y - floor.elevation - ITEM_RESTING_HEIGHT.battery) < .001);
      }
    }
    for (const item of OFFICE.equipment) {
      const floor = OFFICE.floors.find((candidate) => candidate.elevation < item.position.y && candidate.elevation + OFFICE.storeyHeight > item.position.y);
      const surfaceY = item.position.y - ITEM_RESTING_HEIGHT[item.kind];
      const supported = floor.furniture.flatMap((piece) => piece.parts).some((part) =>
        item.position.x > part.x0 && item.position.x < part.x1
        && item.position.z > part.z0 && item.position.z < part.z1
        && Math.abs(part.y1 - surfaceY) < .01);
      assert.ok(supported, `${item.kind} has no supporting surface`);
    }
  });

  test('every floor can be reached by stairs from the start', () => {
    for (const { elevation } of OFFICE.floors) assert.ok(reachable.some((point) => point.y === elevation), `the floor at ${elevation}`);
  });

  test('every evidence and battery can be picked up by walking there from the start', () => {
    for (const spot of OFFICE.floors.flatMap((floor) => [...floor.evidenceSpots, ...floor.batterySpots])) {
      const isWithinReach = (point) => Math.abs(point.y - spot.y) < reachHeight && planarDistance(point, spot) < pickupRadius;
      assert.ok(reachable.some(isWithinReach), `${JSON.stringify(spot)} can't be reached`);
    }
  });

  test('the player can walk up to the exit', () => {
    const { centerX, trigger } = OFFICE.exitDoor;
    assert.ok(reachable.some((point) => point.y === 0 && point.z > trigger.minZ && Math.abs(point.x - centerX) < trigger.halfWidth));
  });

  test('all equipment, notes, drawers and closets have an unobstructed reachable approach', () => {
    for (const item of [...OFFICE.equipment, ...OFFICE.interactables,
      ...OFFICE.batterySpots.map((position) => ({ kind: `battery at ${JSON.stringify(position)}`, position }))]) {
      const accessible = reachable.some((point) => {
        const eye = { ...point, y: point.y + GAME_CONFIG.player.eyeHeight };
        return Math.hypot(eye.x - item.position.x, eye.y - item.position.y, eye.z - item.position.z) < GAME_CONFIG.interaction.range
          && building.hasClearRay(eye, item.position);
      });
      assert.ok(accessible, `${item.id ?? item.kind} has no usable approach`);
    }
  });

  test('every anomaly can be photographed from a reachable location', () => {
    for (const subject of OFFICE.evidenceSpots) {
      assert.ok(reachable.some((point) => {
        const eye = { ...point, y: point.y + GAME_CONFIG.player.eyeHeight };
        const distance = Math.hypot(eye.x - subject.x, eye.y - subject.y, eye.z - subject.z);
        return distance >= GAME_CONFIG.camera.minDistance && distance <= GAME_CONFIG.camera.range && building.hasClearRay(eye, subject);
      }), `${subject.id} has no clear camera angle`);
    }
  });
});
