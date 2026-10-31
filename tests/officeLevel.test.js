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
const overlapArea = (a, b) =>
  Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0))
  * Math.max(0, Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0));

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

  test('furniture stands on walkable floor instead of walls or open pits', () => {
    OFFICE.floors.forEach((floor, index) => {
      const tileMap = building.tileMaps[index];
      for (const piece of floor.furniture) for (const part of piece.parts) {
        const firstX = Math.floor((part.x0 - floor.tilesOrigin.x) / OFFICE.tileSize);
        const lastX = Math.ceil((part.x1 - floor.tilesOrigin.x) / OFFICE.tileSize);
        const firstZ = Math.floor((part.z0 - floor.tilesOrigin.z) / OFFICE.tileSize);
        const lastZ = Math.ceil((part.z1 - floor.tilesOrigin.z) / OFFICE.tileSize);
        for (let x = firstX; x < lastX; x++) for (let z = firstZ; z < lastZ; z++) {
          const tile = {
            x0: floor.tilesOrigin.x + x * OFFICE.tileSize,
            x1: floor.tilesOrigin.x + (x + 1) * OFFICE.tileSize,
            z0: floor.tilesOrigin.z + z * OFFICE.tileSize,
            z1: floor.tilesOrigin.z + (z + 1) * OFFICE.tileSize,
          };
          if (overlapArea(part, tile) <= .005) continue;
          assert.ok(!tileMap.isBlocked((tile.x0 + tile.x1) / 2, (tile.z0 + tile.z1) / 2),
            `${floor.name}: ${piece.name} extends onto a blocked tile`);
        }
      }
    });
  });

  test('raised desk accessories fit entirely on their supporting surface', () => {
    for (const floor of OFFICE.floors) {
      const parts = floor.furniture.flatMap((piece) => piece.parts);
      for (const accessory of parts) {
        if (accessory.y1 - accessory.y0 > .03 || accessory.y0 < floor.elevation + .1) continue;
        const supported = parts.some((surface) => surface !== accessory
          && Math.abs(surface.y1 - accessory.y0) < .015
          && accessory.x0 >= surface.x0 - .001 && accessory.x1 <= surface.x1 + .001
          && accessory.z0 >= surface.z0 - .001 && accessory.z1 <= surface.z1 + .001);
        assert.ok(supported, `${floor.name}: raised accessory hangs off its support at (${accessory.x0}, ${accessory.z0})`);
      }
    }
  });

  test('closets and drawers stand on the floor or fully on a shelf', () => {
    for (const floor of OFFICE.floors) for (const item of floor.interactables.filter((object) => object.box)) {
      if (Math.abs(item.box.y0 - floor.elevation) < .001) continue;
      const supported = floor.furniture.flatMap((piece) => piece.parts).some((surface) =>
        Math.abs(surface.y1 - item.box.y0) < .001
        && item.box.x0 >= surface.x0 && item.box.x1 <= surface.x1
        && item.box.z0 >= surface.z0 && item.box.z1 <= surface.z1);
      assert.ok(supported, `${floor.name}: ${item.name} floats above its support`);
    }
  });

  test('supply drawers open toward walkable space', () => {
    const direction = { north: { x: 0, z: -1 }, south: { x: 0, z: 1 }, east: { x: 1, z: 0 }, west: { x: -1, z: 0 } };
    OFFICE.floors.forEach((floor, index) => {
      for (const drawer of floor.interactables.filter((item) => item.kind === 'cache')) {
        const { box } = drawer, facing = direction[drawer.facing];
        const point = {
          x: (box.x0 + box.x1) / 2 + facing.x * ((box.x1 - box.x0) / 2 + .25),
          z: (box.z0 + box.z1) / 2 + facing.z * ((box.z1 - box.z0) / 2 + .25),
        };
        assert.ok(!building.tileMaps[index].isBlocked(point.x, point.z), `${drawer.id} opens into a wall`);
      }
    });
  });

  test('the entrance and pantry door have clear walking lanes', () => {
    for (const [floorName, lane] of [
      ['ground floor', { x0: 7.5, z0: 7, x1: 8.5, z1: 10 }],
      ['top floor', { x0: 5.5, z0: 8.1, x1: 6.5, z1: 9.5 }],
    ]) {
      const floor = OFFICE.floors.find(({ name }) => name === floorName);
      for (const obstacle of floor.obstacles) {
        assert.equal(overlapArea(obstacle, lane), 0, `${floorName}: furniture obstructs a doorway`);
      }
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

  test('stair rail footprints stay entirely on the stair treads', () => {
    for (const floor of OFFICE.floors) for (const plan of floor.stairs) {
      for (const rail of new StairFlight(plan).rails) {
        assert.ok(rail.x0 >= plan.rect.x0 - 1e-9 && rail.x1 <= plan.rect.x1 + 1e-9);
        assert.ok(rail.z0 >= plan.rect.z0 - 1e-9 && rail.z1 <= plan.rect.z1 + 1e-9);
      }
    }
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
