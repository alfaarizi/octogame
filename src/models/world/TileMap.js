/** @typedef {import('../../types.js').FloorPoint} FloorPoint */
/** @typedef {import('../../types.js').Rect} Rect */

/** What each character of a tile map stands for. */
export const Tile = Object.freeze({
  WALL: '#',
  LOW_WALL: 'F',
  EXIT_DOOR: 'E',
  FLOOR: '.',
  WET_FLOOR: ';',
  CARPORT: '_',
  PAVING: ':',
  GARDEN: ',',
  /** Part of a flight of stairs; the flight decides how high you stand on it. */
  STAIRS: 'S',
  /** Stairs with nothing overhead. */
  OUTDOOR_STAIRS: 's',
  /** An opening in the floor, overlooking the floor below. */
  VOID: '*',
  /** An opening in the floor down to somewhere out of the game, such as stairs to the street. */
  PIT: 'v',
  OUTSIDE: ' ',
});

/** @type {ReadonlySet<string>} Tiles nothing can see through. */
const OPAQUE_TILES = new Set([Tile.WALL, Tile.LOW_WALL, Tile.EXIT_DOOR, Tile.OUTSIDE]);
/** @type {ReadonlySet<string>} Tiles nobody can walk on: everything opaque, plus the openings in the floor. */
const BLOCKING_TILES = new Set([...OPAQUE_TILES, Tile.VOID, Tile.PIT]);
const SIGHT_SAMPLE_STEP = 0.15;

/** A level's tile grid: which tiles block walking or sight, and whether two points can see each other. */
export class TileMap {
  #rows;
  #tileSize;

  /**
   * @param {readonly string[]} rows - One string per row of tiles, one character per tile (see Tile).
   * @param {number} [tileSize] - The width of a tile, in meters.
   */
  constructor(rows, tileSize = 1) {
    if (rows.length === 0 || rows.some((row) => row.length !== rows[0].length)) {
      throw new Error('TileMap rows must be non-empty and all the same length');
    }
    this.#rows = rows;
    this.#tileSize = tileSize;
  }

  get tileSize() {
    return this.#tileSize;
  }

  /** The map's extent along x, in meters. */
  get width() {
    return this.#rows[0].length * this.#tileSize;
  }

  /** The map's extent along z, in meters. */
  get depth() {
    return this.#rows.length * this.#tileSize;
  }

  /** The tile under a point in meters, or undefined outside the map. */
  tileAt(x, z) {
    return this.#tileIn(Math.floor(x / this.#tileSize), Math.floor(z / this.#tileSize));
  }

  /** Whether nobody can walk at this point. Everything outside the map counts as blocked. */
  isBlocked(x, z) {
    return isBlockingTile(this.tileAt(x, z));
  }

  /** Whether this point blocks sight. Everything outside the map counts as opaque. */
  isOpaque(x, z) {
    const tile = this.tileAt(x, z);
    return tile === undefined || OPAQUE_TILES.has(tile);
  }

  /**
   * Calls `visit` for every tile.
   * @param {(tile: string, rect: Rect) => void} visit
   */
  forEachTile(visit) {
    this.#rows.forEach((row, rowIndex) => [...row].forEach((tile, column) => visit(tile, this.#rectOf(column, rowIndex))));
  }

  /**
   * @param {FloorPoint} point
   * @returns {Rect[]} The blocking tiles among the 3 x 3 tiles around `point`, including any outside the map.
   */
  blockingRectsAround({ x, z }) {
    const column = Math.floor(x / this.#tileSize), row = Math.floor(z / this.#tileSize);
    const rects = [];
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = column - 1; c <= column + 1; c++) {
        if (isBlockingTile(this.#tileIn(c, r))) rects.push(this.#rectOf(c, r));
      }
    }
    return rects;
  }

  /**
   * @param {FloorPoint} from
   * @param {FloorPoint} to
   * @returns {boolean} Whether no opaque tile lies on the straight line between the points.
   */
  hasLineOfSight(from, to) {
    const dx = to.x - from.x, dz = to.z - from.z;
    const samples = Math.ceil(Math.hypot(dx, dz) / SIGHT_SAMPLE_STEP);
    for (let i = 1; i < samples; i++) {
      const t = i / samples;
      if (this.isOpaque(from.x + dx * t, from.z + dz * t)) return false;
    }
    return true;
  }

  #tileIn(column, row) {
    return this.#rows[row]?.[column];
  }

  /** @returns {Rect} */
  #rectOf(column, row) {
    const size = this.#tileSize;
    return { x0: column * size, z0: row * size, x1: (column + 1) * size, z1: (row + 1) * size };
  }
}

const isBlockingTile = (tile) => tile === undefined || BLOCKING_TILES.has(tile);
