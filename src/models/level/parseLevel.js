/**
 * @file Turns a level's JSON (see data/) into the Level the game runs on. Each floor file is measured as if that
 * floor stood at height 0; here it's lifted to its storey's elevation, so every height in a Level is measured
 * from the ground floor.
 */

import { atHeight, deepFreeze } from '../../utils.js';
import { Tile } from '../world/TileMap.js';
import { readFurniturePiece } from './furniture.js';
import {
  box,
  compass,
  floorPoint,
  hexColor,
  integer,
  LevelFormatError,
  list,
  number,
  object,
  point3,
  positiveNumber,
  rect,
  text,
} from './validate.js';

/** @typedef {import('../../types.js').CandySpot} CandySpot */
/** @typedef {import('../../types.js').FloorPoint} FloorPoint */
/** @typedef {import('../../types.js').Point3} Point3 */
/** @typedef {import('../../types.js').Rect} Rect */
/** @typedef {import('../../types.js').Box} Box */
/** @typedef {import('../../types.js').SpawnPoint} SpawnPoint */
/** @typedef {import('../world/StairFlight.js').StairFlightPlan} StairFlightPlan */
/** @typedef {import('./furniture.js').FurniturePiece} FurniturePiece */
/** @typedef {import('./furniture.js').Paint} Paint */

/**
 * A jack-o'-lantern: where it sits, and the point its carved face turns toward.
 * @typedef {Point3 & { name: string, lookAt: FloorPoint }} Lantern
 */

/**
 * Something that glows on its own and lights the area around it.
 * @typedef {{ name: string, box: Box, color: number, light: Point3 }} GlowingFixture
 */

/**
 * One floor at its elevation.
 * @typedef {object} PlacedFloor
 * @property {string} name
 * @property {number} elevation - Height of the floor's surface.
 * @property {readonly string[]} tiles - One character per tile (see Tile in world/TileMap.js).
 * @property {readonly FurniturePiece[]} furniture
 * @property {readonly Rect[]} obstacles - The furniture footprints the player bumps into.
 * @property {readonly Lantern[]} lanterns
 * @property {readonly GlowingFixture[]} fixtures
 * @property {readonly Point3[]} portraits - Each hangs on the north wall at (x, z), facing south.
 * @property {readonly CandySpot[]} candySpots - `y` is the height the candy floats at.
 * @property {readonly Point3[]} batterySpots
 * @property {readonly Point3[]} ghostSpots - Where the ghost can appear and drift between.
 * @property {readonly StairFlightPlan[]} stairs - The flights up to the floor above.
 */

/**
 * The exit gate: where it stands and how close the player must come once it's unlocked.
 * @typedef {import('../world/ExitDoor.js').ExitDoorPlacement & { wallZ: number, width: number, height: number }} ExitDoorLayout
 */

/**
 * The whole building, ready to play.
 * @typedef {object} Level
 * @property {string} name
 * @property {number} tileSize - The width of a tile, in meters.
 * @property {number} storeyHeight - From one floor up to the next, which is also every room's height.
 * @property {number} lowWallHeight - Height of low walls and fences.
 * @property {readonly PlacedFloor[]} floors - From the lowest up.
 * @property {SpawnPoint} playerStart
 * @property {Point3} ghostStart
 * @property {ExitDoorLayout} exitDoor
 * @property {readonly Lantern[]} lanterns - Every floor's, together.
 * @property {readonly GlowingFixture[]} fixtures
 * @property {readonly CandySpot[]} candySpots
 * @property {readonly Point3[]} batterySpots
 * @property {readonly Point3[]} ghostSpots
 */

/**
 * The JSON a level is made of.
 * @typedef {object} LevelSources
 * @property {unknown} building - The contents of building.json.
 * @property {unknown} palette - The palette file it names.
 * @property {unknown[]} floors - The floor files it names, in the same order.
 */

const BUILDING_FILE = 'building.json';
/** @type {ReadonlySet<string>} */
const KNOWN_TILES = new Set(Object.values(Tile));

/**
 * @param {unknown} buildingJson - The contents of building.json.
 * @returns {{ palette: string, floors: string[] }} The other files the level is made of, relative to building.json.
 */
export function filesOf(buildingJson) {
  const building = object(buildingJson, BUILDING_FILE);
  return {
    palette: text(building.palette, `${BUILDING_FILE} palette`),
    floors: list(building.floors, `${BUILDING_FILE} floors`, (floor, path) => text(object(floor, path).file, `${path}.file`)),
  };
}

/**
 * @param {LevelSources} sources
 * @returns {Level}
 * @throws {LevelFormatError} If anything in the files is missing or malformed.
 */
export function parseLevel({ building: buildingJson, palette, floors: floorJsons }) {
  const building = object(buildingJson, BUILDING_FILE);
  const files = filesOf(building);
  const paint = createPaint(palette, files.palette);
  const storeyHeight = positiveNumber(building.storeyHeight, `${BUILDING_FILE} storeyHeight`);
  const elevations = readElevations(building.floors, storeyHeight);
  if (floorJsons.length !== elevations.length) {
    throw new LevelFormatError(`${BUILDING_FILE} floors`, `names ${elevations.length} floor files, but ${floorJsons.length} were loaded`);
  }
  const floors = elevations.map((elevation, index) => placeFloor(readFloor(floorJsons[index], files.floors[index], paint), elevation));
  const spawnAt = (json, path) => {
    const spawn = object(json, path);
    return { x: number(spawn.x, `${path}.x`), y: integer(spawn.storey, `${path}.storey`) * storeyHeight, z: number(spawn.z, `${path}.z`) };
  };
  const playerStartPath = `${BUILDING_FILE} playerStart`;

  return deepFreeze({
    name: text(building.name, `${BUILDING_FILE} name`),
    tileSize: positiveNumber(building.tileSize, `${BUILDING_FILE} tileSize`),
    storeyHeight,
    lowWallHeight: positiveNumber(building.lowWallHeight, `${BUILDING_FILE} lowWallHeight`),
    floors,
    playerStart: { ...spawnAt(building.playerStart, playerStartPath), yaw: number(object(building.playerStart, playerStartPath).yaw, `${playerStartPath}.yaw`) },
    ghostStart: spawnAt(building.ghostStart, `${BUILDING_FILE} ghostStart`),
    exitDoor: readExitDoor(building.exitDoor, `${BUILDING_FILE} exitDoor`),
    lanterns: floors.flatMap((floor) => floor.lanterns),
    fixtures: floors.flatMap((floor) => floor.fixtures),
    candySpots: floors.flatMap((floor) => floor.candySpots),
    batterySpots: floors.flatMap((floor) => floor.batterySpots),
    ghostSpots: floors.flatMap((floor) => floor.ghostSpots),
  });
}

/** @returns {number[]} Each floor's elevation, checking they're listed from the lowest storey up. */
function readElevations(floorsJson, storeyHeight) {
  const storeys = list(floorsJson, `${BUILDING_FILE} floors`, (floor, path) => integer(object(floor, path).storey, `${path}.storey`));
  storeys.forEach((storey, index) => {
    if (index > 0 && storey <= storeys[index - 1]) {
      throw new LevelFormatError(`${BUILDING_FILE} floors[${index}].storey`, 'floors must be listed from the lowest storey up');
    }
  });
  return storeys.map((storey) => storey * storeyHeight);
}

/** @returns {Paint} */
function createPaint(paletteJson, file) {
  const colors = new Map(Object.entries(object(paletteJson, file)).map(([name, value]) => [name, hexColor(value, `${file} ${name}`)]));
  return (color, path) => {
    if (typeof color === 'string' && color.startsWith('#')) return hexColor(color, path);
    if (typeof color === 'string' && colors.has(color)) return /** @type {number} */ (colors.get(color));
    throw new LevelFormatError(path, `expected a color named in ${file} or a "#rrggbb" value, found ${JSON.stringify(color)}`);
  };
}

/**
 * One floor as its file describes it, at height 0.
 * @param {Paint} paint
 * @returns {Omit<PlacedFloor, 'elevation' | 'obstacles'>}
 */
function readFloor(json, file, paint) {
  const floor = object(json, file);
  const sections = object(floor.furniture, `${file} furniture`);
  return {
    name: text(floor.name, `${file} name`),
    tiles: readTiles(floor.tiles, `${file} tiles`),
    furniture: Object.entries(sections).flatMap(([section, pieces]) =>
      list(pieces, `${file} furniture.${section}`, (piece, path) => readFurniturePiece(piece, path, paint)),
    ),
    lanterns: list(floor.lanterns, `${file} lanterns`, readLantern),
    fixtures: list(floor.fixtures, `${file} fixtures`, (fixture, path) => readFixture(fixture, path, paint)),
    portraits: list(floor.portraits, `${file} portraits`, floorPoint),
    candySpots: list(floor.candySpots, `${file} candySpots`, readCandySpot),
    batterySpots: list(floor.batterySpots, `${file} batterySpots`, point3),
    ghostSpots: list(floor.ghostSpots, `${file} ghostSpots`, floorPoint),
    stairs: list(floor.stairs, `${file} stairs`, readStairFlight),
  };
}

/** @returns {string[]} */
function readTiles(json, path) {
  const rows = list(json, path, text);
  rows.forEach((row, index) => {
    if (row.length !== rows[0].length) throw new LevelFormatError(`${path}[${index}]`, `is ${row.length} tiles long, but the first row is ${rows[0].length}`);
    const unknown = [...row].find((tile) => !KNOWN_TILES.has(tile));
    if (unknown !== undefined) throw new LevelFormatError(`${path}[${index}]`, `"${unknown}" isn't a tile (see Tile in models/world/TileMap.js)`);
  });
  return rows;
}

/** @returns {Lantern} */
function readLantern(json, path) {
  const lantern = object(json, path);
  return { name: text(lantern.name, `${path}.name`), ...point3(lantern, path), lookAt: floorPoint(lantern.lookAt, `${path}.lookAt`) };
}

/**
 * @param {Paint} paint
 * @returns {GlowingFixture}
 */
function readFixture(json, path, paint) {
  const fixture = object(json, path);
  return {
    name: text(fixture.name, `${path}.name`),
    box: box(fixture.box, `${path}.box`),
    color: paint(fixture.color, `${path}.color`),
    light: point3(fixture.light, `${path}.light`),
  };
}

/** @returns {CandySpot} */
function readCandySpot(json, path) {
  const spot = object(json, path);
  return { room: text(spot.room, `${path}.room`), ...point3(spot, path) };
}

/** @returns {StairFlightPlan} */
function readStairFlight(json, path) {
  const flight = object(json, path);
  const low = number(flight.low, `${path}.low`), high = number(flight.high, `${path}.high`);
  if (high < low) throw new LevelFormatError(`${path}.high`, 'a flight must not end lower than it starts');
  return {
    rect: rect(flight.rect, `${path}.rect`),
    rises: flight.rises === null ? null : compass(flight.rises, `${path}.rises`),
    low,
    high,
    rails: list(flight.rails, `${path}.rails`, compass),
  };
}

/** @returns {ExitDoorLayout} */
function readExitDoor(json, path) {
  const door = object(json, path);
  const trigger = object(door.trigger, `${path}.trigger`);
  return {
    centerX: number(door.centerX, `${path}.centerX`),
    wallZ: number(door.wallZ, `${path}.wallZ`),
    width: positiveNumber(door.width, `${path}.width`),
    height: positiveNumber(door.height, `${path}.height`),
    trigger: { minZ: number(trigger.minZ, `${path}.trigger.minZ`), halfWidth: positiveNumber(trigger.halfWidth, `${path}.trigger.halfWidth`) },
  };
}

/**
 * Lifts a floor, measured at height 0, to its elevation, and collects its furniture footprints.
 * @param {Omit<PlacedFloor, 'elevation' | 'obstacles'>} floor
 * @param {number} elevation
 * @returns {PlacedFloor}
 */
function placeFloor(floor, elevation) {
  /** @type {<T extends { y: number }>(point: T) => T} */
  const lift = (point) => ({ ...point, y: point.y + elevation });
  /** @type {<T extends { y0: number, y1: number }>(box: T) => T} */
  const liftBox = (part) => ({ ...part, y0: part.y0 + elevation, y1: part.y1 + elevation });
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
