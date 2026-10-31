import { CollisionWorld } from './CollisionWorld.js';
import { StairFlight } from './StairFlight.js';
import { TileMap } from './TileMap.js';

/** @typedef {import('../../types.js').Point3} Point3 */
/** @typedef {import('../../types.js').Rect} Rect */

/**
 * What the building needs to know about one floor.
 * @typedef {object} FloorPlan
 * @property {number} elevation - Height of the floor's surface.
 * @property {readonly string[]} tiles - One string per row (see TileMap).
 * @property {import('../../types.js').FloorPoint} [tilesOrigin] - Where the first row's first tile lies; the corner of the grounds if not given.
 * @property {readonly Rect[]} obstacles - Furniture footprints.
 * @property {readonly import('./StairFlight.js').StairFlightPlan[]} stairs - The flights up to the next floor.
 */

/**
 * @typedef {object} Floor
 * @property {number} elevation
 * @property {TileMap} tileMap
 * @property {StairFlight[]} stairs - The flights up from this floor and up to it from the one below.
 * @property {CollisionWorld} collisions
 */

/** The most the ground may rise or drop under a body in one move; anything more is a wall or a ledge. */
const MAX_STEP = 0.4;

/**
 * The office's floors stacked by elevation, and the stairs between them. Bodies walk on one floor at a time
 * and reach the others by stairs; floors and walls block sight.
 */
export class Building {
  /** @type {Floor[]} */
  #floors;

  /**
   * @param {readonly FloorPlan[]} floors - From the lowest up.
   * @param {number} tileSize - The width of a tile, in meters.
   */
  constructor(floors, tileSize) {
    const flightsUp = floors.map((floor) => floor.stairs.map((plan) => new StairFlight(plan)));
    this.#floors = floors.map((floor, index) => {
      const tileMap = new TileMap(floor.tiles, tileSize, floor.tilesOrigin);
      const stairs = [...flightsUp[index], ...(flightsUp[index - 1] ?? [])];
      const obstacles = [...floor.obstacles, ...stairs.flatMap((flight) => flight.rails)];
      const occluders = [...(floor.furniture ?? []).flatMap((piece) => piece.parts),
        ...(floor.interactables ?? []).filter((item) => item.box).map((item) => item.box)];
      return { elevation: floor.elevation, tileMap, stairs, occluders, collisions: new CollisionWorld(tileMap, obstacles) };
    });
  }

  /** @returns {readonly TileMap[]} Each floor's tiles, from the lowest up, in the same order as the floors given. */
  get tileMaps() {
    return this.#floors.map((floor) => floor.tileMap);
  }

  /**
   * Moves a body standing at `position` (in place) by `dx` and `dz`: out of walls, furniture and stairs it
   * can't step onto, and up or down the stairs it walks on.
   * @param {Point3} position
   * @param {number} dx
   * @param {number} dz
   * @param {number} radius
   */
  move(position, dx, dz, radius) {
    const floor = this.#floorAt(position.y);
    const next = { x: position.x + dx, z: position.z + dz };
    const outOfStep = floor.stairs.filter((flight) => !isWithinStep(flight.heightAt(next), position.y));
    floor.collisions.resolveCircle(next, radius, outOfStep.map((flight) => flight.rect));
    const height = floor.stairs.find((flight) => flight.contains(next))?.heightAt(next) ?? floor.elevation;
    if (!isWithinStep(height, position.y)) return;
    Object.assign(position, { x: next.x, y: height, z: next.z });
  }

  /** @param {Point3} position */
  isOpaque({ x, y, z }) {
    return this.#floorAt(y).tileMap.isOpaque(x, z);
  }

  /**
   * @param {Point3} from - Where a body stands.
   * @param {Point3} to - Where another stands.
   * @returns {boolean} Whether they're on the same floor with no wall between them.
   */
  hasLineOfSight(from, to) {
    const floor = this.#floorAt(from.y);
    return floor === this.#floorAt(to.y) && this.hasClearRay(
      { ...from, y: from.y + 1.2 }, { ...to, y: to.y + 1.2 });
  }

  /** Physical, eye-height sight check used by interactions, photography and the ghost. */
  hasClearRay(from, to) {
    const floorFor = (y) => this.#floors.findLast((floor) => floor.elevation <= y + 0.001);
    const floor = floorFor(from.y);
    if (!floor || floor !== floorFor(to.y) || !floor.tileMap.hasLineOfSight(from, to)) return false;
    return !floor.occluders.some((box) => segmentIntersectsBox(from, to, box));
  }

  /** Finds a grounded drop point along a short, collision-resolved walk. */
  dropPosition(position, yaw, distance, radius) {
    const result = { ...position };
    const steps = Math.ceil(distance / 0.08);
    for (let step = 0; step < steps; step++) {
      this.move(result, -Math.sin(yaw) * distance / steps, -Math.cos(yaw) * distance / steps, radius);
    }
    const floor = this.#floorAt(result.y);
    const stair = floor.stairs.find((flight) => flight.contains(result));
    return { ...result, y: stair?.treadHeightAt(result) ?? result.y };
  }

  /** The floor nearest `height`; halfway up the stairs, that's the upper one. */
  #floorAt(height) {
    return this.#floors.reduce((nearest, floor) =>
      Math.abs(floor.elevation - height) <= Math.abs(nearest.elevation - height) ? floor : nearest,
    );
  }
}

const isWithinStep = (height, standingHeight) => Math.abs(height - standingHeight) <= MAX_STEP;

/** Slab intersection, excluding endpoint contact so an object can be targeted on its surface. */
function segmentIntersectsBox(from, to, box) {
  let near = 0.002, far = 0.998;
  for (const axis of ['x', 'y', 'z']) {
    const delta = to[axis] - from[axis];
    const low = box[`${axis}0`], high = box[`${axis}1`];
    if (Math.abs(delta) < 1e-9) {
      if (from[axis] <= low || from[axis] >= high) return false;
      continue;
    }
    const a = (low - from[axis]) / delta, b = (high - from[axis]) / delta;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near >= far) return false;
  }
  return true;
}
