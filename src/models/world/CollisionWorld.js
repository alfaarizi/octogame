/** @typedef {import('../../types.js').FloorPoint} FloorPoint */
/** @typedef {import('../../types.js').Rect} Rect */

const RESOLVE_PASSES = 2;

/**
 * Keeps round bodies (the player) out of walls and furniture by pushing them back out.
 * Only the tiles next to a body's center are checked, so its radius must be smaller than a tile.
 */
export class CollisionWorld {
  #tileMap;
  #obstacles;

  /**
   * @param {import('./TileMap.js').TileMap} tileMap - The level's walls.
   * @param {readonly Rect[]} obstacles - Floor-plan rectangles, such as furniture.
   */
  constructor(tileMap, obstacles) {
    this.#tileMap = tileMap;
    this.#obstacles = obstacles;
  }

  /**
   * Moves `position` (in place) until a circle of `radius` around it overlaps nothing solid.
   * @param {FloorPoint} position
   * @param {number} radius
   * @param {readonly Rect[]} [extraObstacles] - Solid for this call only.
   */
  resolveCircle(position, radius, extraObstacles = []) {
    for (let pass = 0; pass < RESOLVE_PASSES; pass++) {
      for (const rects of [this.#tileMap.blockingRectsAround(position), this.#obstacles, extraObstacles]) {
        for (const rect of rects) pushCircleOutOfRect(position, radius, rect);
      }
    }
  }
}

/**
 * @param {FloorPoint} position - Moved in place.
 * @param {number} radius
 * @param {Rect} rect
 */
function pushCircleOutOfRect(position, radius, { x0, z0, x1, z1 }) {
  const nearestX = Math.max(x0, Math.min(position.x, x1));
  const nearestZ = Math.max(z0, Math.min(position.z, z1));
  const dx = position.x - nearestX, dz = position.z - nearestZ;
  const distanceSquared = dx * dx + dz * dz;
  if (distanceSquared >= radius * radius) return;

  if (distanceSquared > 1e-9) {
    const distance = Math.sqrt(distanceSquared);
    position.x += (dx / distance) * (radius - distance);
    position.z += (dz / distance) * (radius - distance);
    return;
  }

  // The center is inside the rectangle: leave through the nearest side.
  const exits = [
    { gap: position.x - x0, apply: () => (position.x = x0 - radius) },
    { gap: x1 - position.x, apply: () => (position.x = x1 + radius) },
    { gap: position.z - z0, apply: () => (position.z = z0 - radius) },
    { gap: z1 - position.z, apply: () => (position.z = z1 + radius) },
  ];
  exits.reduce((nearest, exit) => (exit.gap < nearest.gap ? exit : nearest)).apply();
}
