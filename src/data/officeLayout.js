/**
 * @file The whole office: its floors stacked at their elevations, where a round starts and ends, and every spawn
 * point. Each floor's own data lives in data/office/ and is measured as if that floor stood at height 0; here it
 * is lifted to its elevation, so every height below is measured from the ground floor.
 */

import { atHeight, deepFreeze } from '../utils.js';
import { STOREY_HEIGHT } from './office/floorKit.js';
import { GROUND_FLOOR } from './office/groundFloor.js';
import { TOP_FLOOR } from './office/topFloor.js';

/** @typedef {import('./office/floorKit.js').FloorLayout} FloorLayout */
/** @typedef {import('../types.js').Point3} Point3 */
/** @typedef {import('../types.js').Rect} Rect */
/** @typedef {import('../types.js').SpawnPoint} SpawnPoint */

/**
 * A floor at its elevation, with the furniture footprints the player bumps into.
 * @typedef {Omit<FloorLayout, 'portraits' | 'ghostSpots'> & {
 *   elevation: number,
 *   obstacles: Rect[],
 *   portraits: Point3[],
 *   ghostSpots: Point3[],
 * }} PlacedFloor
 */

export { STOREY_HEIGHT };
export const TILE_SIZE = 0.5;
/** Height of the street fence and the yard's low walls. */
export const LOW_WALL_HEIGHT = 1.6;

/**
 * @param {FloorLayout} floor
 * @param {number} elevation
 * @returns {PlacedFloor}
 */
function placeFloor(floor, elevation) {
  /** @type {<T extends { y: number }>(point: T) => T} */
  const lift = (point) => ({ ...point, y: point.y + elevation });
  /** @type {<T extends { y0: number, y1: number }>(box: T) => T} */
  const liftBox = (box) => ({ ...box, y0: box.y0 + elevation, y1: box.y1 + elevation });
  return {
    ...floor,
    elevation,
    obstacles: floor.furniture.flatMap((piece) => piece.footprint ?? []),
    furniture: floor.furniture.map((piece) => ({ ...piece, parts: piece.parts.map(liftBox) })),
    lanterns: floor.lanterns.map(lift),
    fixtures: floor.fixtures.map((fixture) => ({ ...fixture, box: liftBox(fixture.box), light: lift(fixture.light) })),
    portraits: floor.portraits.map((spot) => atHeight(spot, elevation)),
    candySpots: floor.candySpots.map(lift),
    batterySpots: floor.batterySpots.map(lift),
    ghostSpots: floor.ghostSpots.map((spot) => atHeight(spot, elevation)),
    stairs: floor.stairs.map((flight) => ({ ...flight, low: flight.low + elevation, high: flight.high + elevation })),
  };
}

/** @type {readonly PlacedFloor[]} From the lowest up. */
export const FLOORS = deepFreeze([placeFloor(GROUND_FLOOR, 0), placeFloor(TOP_FLOOR, STOREY_HEIGHT)]);

/** @type {SpawnPoint} In the lobby, just inside the main entrance, facing into the office. */
export const PLAYER_START = deepFreeze({ x: 8.0, y: 0, z: 8.4, yaw: 0 });
/** @type {Point3} On the landing of the basement stairwell. */
export const GHOST_START = deepFreeze({ x: 20.5, y: 0, z: 1.0 });

/** @type {import('../world/ExitDoor.js').ExitDoorPlacement & { wallZ: number, width: number, height: number }} */
export const EXIT_DOOR = deepFreeze({
  centerX: 17.75,
  // The gate's inner face
  wallZ: 22.0,
  width: 4.5,
  height: 2.0,
  trigger: { minZ: 21.3, halfWidth: 2.0 },
});

export const LANTERNS = deepFreeze(FLOORS.flatMap((floor) => floor.lanterns));
export const GLOWING_FIXTURES = deepFreeze(FLOORS.flatMap((floor) => floor.fixtures));
export const CANDY_SPOTS = deepFreeze(FLOORS.flatMap((floor) => floor.candySpots));
export const BATTERY_SPOTS = deepFreeze(FLOORS.flatMap((floor) => floor.batterySpots));
export const GHOST_SPOTS = deepFreeze(FLOORS.flatMap((floor) => floor.ghostSpots));
