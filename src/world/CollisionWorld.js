const RESOLVE_PASSES = 2;

/** Keeps round bodies (the player) out of walls and furniture by pushing them back out. */
export class CollisionWorld {
  #tileMap;
  #obstacles;

  /** @param obstacles floor-plan rectangles { x0, z0, x1, z1 } */
  constructor(tileMap, obstacles) {
    this.#tileMap = tileMap;
    this.#obstacles = obstacles;
  }

  /** Moves `position` (in place) until a circle of `radius` around it overlaps nothing solid. */
  resolveCircle(position, radius) {
    for (let pass = 0; pass < RESOLVE_PASSES; pass++) {
      this.#resolveAgainstWalls(position, radius);
      for (const obstacle of this.#obstacles) pushCircleOutOfRect(position, radius, obstacle);
    }
  }

  #resolveAgainstWalls(position, radius) {
    const column = Math.floor(position.x), row = Math.floor(position.z);
    for (let z = row - 1; z <= row + 1; z++) {
      for (let x = column - 1; x <= column + 1; x++) {
        if (this.#tileMap.isBlocked(x + 0.5, z + 0.5)) {
          pushCircleOutOfRect(position, radius, { x0: x, z0: z, x1: x + 1, z1: z + 1 });
        }
      }
    }
  }
}

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
