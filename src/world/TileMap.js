export const Tile = Object.freeze({ WALL: '#', FLOOR: '.', EXIT_DOOR: 'E' });

const BLOCKING_TILES = new Set([Tile.WALL, Tile.EXIT_DOOR]);
const SIGHT_SAMPLE_STEP = 0.15;

/** The house's tile grid: which tiles are solid, and whether two points can see each other. */
export class TileMap {
  #rows;

  constructor(rows) {
    if (rows.length === 0 || rows.some((row) => row.length !== rows[0].length)) {
      throw new Error('TileMap rows must be non-empty and all the same length');
    }
    this.#rows = rows;
  }

  get width() {
    return this.#rows[0].length;
  }

  get depth() {
    return this.#rows.length;
  }

  /** The tile under a world point, or undefined outside the map. */
  tileAt(x, z) {
    return this.#rows[Math.floor(z)]?.[Math.floor(x)];
  }

  /** Walls, the front door and everything outside the map are solid. */
  isBlocked(x, z) {
    const tile = this.tileAt(x, z);
    return tile === undefined || BLOCKING_TILES.has(tile);
  }

  /** Calls visit(tile, column, row) for every tile. */
  forEachTile(visit) {
    this.#rows.forEach((row, z) => [...row].forEach((tile, x) => visit(tile, x, z)));
  }

  /** True when no solid tile lies on the straight line between two floor points. */
  hasLineOfSight(from, to) {
    const dx = to.x - from.x, dz = to.z - from.z;
    const samples = Math.ceil(Math.hypot(dx, dz) / SIGHT_SAMPLE_STEP);
    for (let i = 1; i < samples; i++) {
      const t = i / samples;
      if (this.isBlocked(from.x + dx * t, from.z + dz * t)) return false;
    }
    return true;
  }
}
