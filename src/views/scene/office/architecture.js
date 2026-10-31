import * as THREE from 'three';
import { RAIL_THICKNESS } from '../../../models/world/StairFlight.js';
import { Tile } from '../../../models/world/TileMap.js';
import { Compass, edgeStrip } from '../../../utils.js';
import { createFlatSurfaceGeometry, createMergedBoxMesh } from '../meshes.js';
import { createConcreteTexture, createGardenPavingTexture, createOfficeFloorTexture, createOfficeWallTexture, createStoneTileTexture, furnitureFinishTexture } from './textures.js';

/** @typedef {import('../../../models/level/parseLevel.js').Level} Level */
/** @typedef {import('../../../models/level/parseLevel.js').PlacedFloor} PlacedFloor */
/** @typedef {import('../../../models/world/StairFlight.js').StairFlightPlan} StairFlightPlan */
/** @typedef {import('../../../models/world/TileMap.js').TileMap} TileMap */
/** @typedef {import('../../../types.js').Box} Box */
/** @typedef {import('../../../types.js').FloorPoint} FloorPoint */
/** @typedef {import('../../../types.js').Rect} Rect */

/**
 * One floor's tiles, grouped for drawing, and the floor above it (if any) to tell where its ceiling goes.
 * @typedef {object} Storey
 * @property {number} elevation
 * @property {TileMap} tileMap
 * @property {TileMap | undefined} tileMapAbove
 * @property {Map<string, Rect[]>} rectsByTile
 */

const TEXTURE_METERS = 2;
/** How far below the floor a pit appears to go. */
const PIT_DEPTH = 0.6;
const RAILING = Object.freeze({ height: 1.0, middleHeight: 0.5, thickness: 0.05 });
/** The most one step rises, and how far a stair's parapet stands above its treads. */
const STAIRS = Object.freeze({ maxRiser: 0.19, parapetHeight: 0.9 });
/** @type {readonly string[]} Tiles with a flat floor. */
const FLOOR_TILES = Object.freeze([Tile.FLOOR, Tile.CARPORT, Tile.WET_FLOOR, Tile.PAVING, Tile.GARDEN]);
/** @type {ReadonlySet<string>} Tiles with a roof over them when no floor stands above. */
const ROOFED_TILES = new Set([Tile.FLOOR, Tile.WET_FLOOR, Tile.CARPORT, Tile.STAIRS, Tile.VOID]);
/** @type {readonly string[]} Openings in the floor, railed off wherever they meet a flat floor. */
const OPENING_TILES = Object.freeze([Tile.VOID, Tile.PIT]);
const TRIM_FACING_TILES = Object.freeze([Tile.FLOOR, Tile.WET_FLOOR, Tile.CARPORT]);

/**
 * The building itself on every floor: walls, floors, ceilings, the railings around openings, and the stairs.
 * @param {Level} level
 * @param {readonly TileMap[]} tileMaps - Each floor's tiles, in the same order as `level.floors`.
 * @returns {THREE.Object3D[]}
 */
export function createArchitecture({ floors, storeyHeight, lowWallHeight }, tileMaps) {
  /** @type {Storey[]} */
  const storeys = floors.map(({ elevation }, index) => ({
    elevation,
    tileMap: tileMaps[index],
    tileMapAbove: tileMaps[index + 1],
    rectsByTile: groupTileRects(tileMaps[index]),
  }));
  const wallsOf = (tile, height) =>
    storeys.flatMap(({ elevation, rectsByTile }) => raise(rectsByTile.get(tile) ?? [], elevation, elevation + height));
  const plaster = createOfficeWallTexture();
  const concrete = createConcreteTexture();
  const wallMaterial = new THREE.MeshStandardMaterial({ map: plaster, bumpMap: plaster, bumpScale: .012, roughness: .94 });
  return [
    createWalls(wallsOf(Tile.WALL, storeyHeight), wallMaterial),
    createWalls(wallsOf(Tile.LOW_WALL, lowWallHeight), new THREE.MeshStandardMaterial({ map: concrete, bumpMap: concrete, bumpScale: .015, roughness: 1 })),
    createWallTrim(storeys),
    ...createFloors(storeys),
    createPitLining(storeys),
    ...createCeilings(storeys, storeyHeight),
    createRailings(storeys),
    createStairs(floors),
  ];
}

/** Shallow skirting boards tie the painted walls to the interior floor. */
function createWallTrim(storeys) {
  const boxes = [];
  for (const { elevation, tileMap, rectsByTile } of storeys) {
    for (const rect of rectsByTile.get(Tile.WALL) ?? []) {
      for (const side of sidesFacing(rect, tileMap, TRIM_FACING_TILES)) {
        boxes.push({ ...edgeStrip(rect, side, .045), y0: elevation, y1: elevation + .105 });
      }
    }
  }
  const grain = furnitureFinishTexture('wood');
  const trim = createMergedBoxMesh(boxes, new THREE.MeshStandardMaterial({ color: 0x34302c, map: grain, bumpMap: grain, bumpScale: .008, roughness: .85 }));
  trim.castShadow = trim.receiveShadow = true;
  return trim;
}

/** Close the exposed sides of shallow yard pits so their bottoms belong to the surrounding paving. */
function createPitLining(storeys) {
  const boxes = [];
  for (const { elevation, tileMap, rectsByTile } of storeys) {
    for (const rect of rectsByTile.get(Tile.PIT) ?? []) {
      for (const side of sidesFacing(rect, tileMap, FLOOR_TILES)) {
        boxes.push({ ...edgeStrip(rect, side, .07), y0: elevation - PIT_DEPTH, y1: elevation });
      }
    }
  }
  const lining = createMergedBoxMesh(boxes, new THREE.MeshStandardMaterial({ color: 0x4d504c, roughness: 1 }));
  lining.castShadow = lining.receiveShadow = true;
  return lining;
}

/**
 * One box per wall tile, all drawn as a single instanced mesh.
 * @param {Box[]} boxes
 */
function createWalls(boxes, material) {
  const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(), material, boxes.length);
  const placement = new THREE.Matrix4();
  boxes.forEach(({ x0, y0, z0, x1, y1, z1 }, index) => {
    placement.makeScale(x1 - x0, y1 - y0, z1 - z0).setPosition((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    walls.setMatrixAt(index, placement);
  });
  walls.castShadow = walls.receiveShadow = true;
  return walls;
}

/**
 * A surface for each kind of floor on each storey, and the bottoms of the pits.
 * @param {Storey[]} storeys
 */
function createFloors(storeys) {
  const officeFloor = createOfficeFloorTexture(), stone = createStoneTileTexture();
  // Drawn in front of the tops of the walls below, which end at the same height.
  const floor = (look) => new THREE.MeshStandardMaterial({ ...look, polygonOffset: true, polygonOffsetFactor: -1 });
  const surfaces = [
    { tile: Tile.FLOOR, material: floor({ map: officeFloor, bumpMap: officeFloor, bumpScale: .004, roughness: 0.6 }) },
    { tile: Tile.CARPORT, material: floor({ map: officeFloor, bumpMap: officeFloor, bumpScale: .006, color: 0xc4bcae, roughness: 0.8 }) },
    { tile: Tile.WET_FLOOR, material: floor({ map: stone, bumpMap: stone, bumpScale: .006, roughness: 0.5 }) },
    { tile: Tile.PAVING, material: floor({ map: stone, bumpMap: stone, bumpScale: .01, roughness: 0.9 }) },
    { tile: Tile.GARDEN, material: floor({ map: createGardenPavingTexture(), roughness: 1 }) },
    { tile: Tile.PIT, depth: PIT_DEPTH, material: new THREE.MeshStandardMaterial({ color: 0x0b0a09, roughness: 1 }) },
  ];
  return storeys.flatMap(({ elevation, rectsByTile }) =>
    surfaces
      .filter(({ tile }) => rectsByTile.has(tile))
      .map(({ tile, depth = 0, material }) => createSurface(rectsByTile.get(tile), elevation - depth, true, material)),
  );
}

/**
 * Each storey's ceiling: the underside of the floor above, or the roof where nothing stands above a roofed tile.
 * @param {Storey[]} storeys
 */
function createCeilings(storeys, storeyHeight) {
  const material = new THREE.MeshStandardMaterial({ color: 0x1d1a17, roughness: 1 });
  return storeys.map(({ elevation, tileMapAbove, rectsByTile }) => {
    const rects = [...rectsByTile].flatMap(([tile, rects]) =>
      tile === Tile.WALL ? [] : rects.filter(({ x0, z0, x1, z1 }) => hasCeiling(tile, tileMapAbove?.tileAt((x0 + x1) / 2, (z0 + z1) / 2))),
    );
    return createSurface(rects, elevation + storeyHeight, false, material);
  });
}

/**
 * @param {string} tile
 * @param {string | undefined} tileAbove - The tile on the floor above, if there is a floor above.
 */
function hasCeiling(tile, tileAbove) {
  if (tileAbove === undefined || tileAbove === Tile.OUTSIDE) return ROOFED_TILES.has(tile);
  return FLOOR_TILES.includes(tileAbove);
}

/** A floor or ceiling. It casts shadows so the flashlight can't shine through it onto the next floor. */
function createSurface(rects, y, facesUp, material) {
  const surface = new THREE.Mesh(createFlatSurfaceGeometry(rects, y, { facesUp, textureMeters: TEXTURE_METERS }), material);
  surface.castShadow = surface.receiveShadow = true;
  return surface;
}

/**
 * A rail along every edge where an opening in the floor meets floor you can walk on.
 * @param {Storey[]} storeys
 */
function createRailings(storeys) {
  const { height, middleHeight, thickness } = RAILING;
  const boxes = [];
  for (const { elevation, tileMap, rectsByTile } of storeys) {
    const segments = [];
    for (const rect of OPENING_TILES.flatMap((tile) => rectsByTile.get(tile) ?? [])) {
      for (const side of sidesFacing(rect, tileMap, FLOOR_TILES)) {
        segments.push(edgeStrip(rect, side, thickness));
      }
    }
    for (const rail of mergeRailingSegments(segments)) {
      boxes.push(
        { ...rail, y0: elevation + height - thickness, y1: elevation + height },
        { ...rail, y0: elevation + middleHeight - thickness / 2, y1: elevation + middleHeight + thickness / 2 },
      );
      const alongX = rail.x1 - rail.x0 > rail.z1 - rail.z0;
      const length = alongX ? rail.x1 - rail.x0 : rail.z1 - rail.z0;
      for (let index = 0; index <= Math.ceil(length / 0.75); index++) {
        const offset = Math.min(length - thickness, index * length / Math.ceil(length / 0.75));
        boxes.push(alongX
          ? { x0: rail.x0 + offset, x1: rail.x0 + offset + thickness, z0: rail.z0, z1: rail.z1, y0: elevation, y1: elevation + height }
          : { x0: rail.x0, x1: rail.x1, z0: rail.z0 + offset, z1: rail.z0 + offset + thickness, y0: elevation, y1: elevation + height });
      }
    }
  }
  const railings = createMergedBoxMesh(boxes, new THREE.MeshStandardMaterial({ color: 0x4a4f55, roughness: 0.5, metalness: 0.6 }));
  railings.castShadow = true;
  return railings;
}

/** Join adjacent half-meter edges so one opening reads as a single railing. */
function mergeRailingSegments(segments) {
  const merged = [];
  for (const segment of segments) {
    const alongX = segment.x1 - segment.x0 > segment.z1 - segment.z0;
    const found = merged.find((other) => alongX
      ? other.z0 === segment.z0 && other.z1 === segment.z1 && other.x1 === segment.x0
      : other.x0 === segment.x0 && other.x1 === segment.x1 && other.z1 === segment.z0);
    if (found) {
      if (alongX) found.x1 = segment.x1;
      else found.z1 = segment.z1;
    } else merged.push({ ...segment });
  }
  return merged;
}

/**
 * Every flight cut into solid steps standing on the floor it rises from, with a parapet along each open side.
 * @param {readonly PlacedFloor[]} floors
 */
function createStairs(floors) {
  const steps = [];
  const rails = new THREE.Group();
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x39413e, roughness: 0.65, metalness: 0.35 });
  for (const { elevation, stairs } of floors) {
    for (const flight of stairs) {
      for (const { rect, top } of stepsOf(flight)) {
        steps.push({ ...rect, y0: elevation, y1: top });
      }
      for (const side of flight.rails) rails.add(...createStairRail(flight, side, railMaterial));
    }
  }
  const stairs = new THREE.Group();
  const treads = createMergedBoxMesh(steps, new THREE.MeshStandardMaterial({ color: 0x6f6a63, roughness: 0.8 }));
  treads.castShadow = treads.receiveShadow = true;
  stairs.add(treads, rails);
  return stairs;
}

/** Sloped handrails and sparse posts, each grounded on its own tread. */
function createStairRail(flight, side, material) {
  const { rect } = flight;
  const alongX = side.z !== 0;
  const endpoints = alongX
    ? [{ x: rect.x0, z: side.z < 0 ? rect.z0 : rect.z1 }, { x: rect.x1, z: side.z < 0 ? rect.z0 : rect.z1 }]
    : [{ x: side.x < 0 ? rect.x0 : rect.x1, z: rect.z0 }, { x: side.x < 0 ? rect.x0 : rect.x1, z: rect.z1 }];
  const at = (fraction) => ({
    x: endpoints[0].x + (endpoints[1].x - endpoints[0].x) * fraction,
    z: endpoints[0].z + (endpoints[1].z - endpoints[0].z) * fraction,
  });
  const beam = (from, to, width) => {
    const start = new THREE.Vector3(from.x, from.y, from.z), end = new THREE.Vector3(to.x, to.y, to.z);
    const direction = end.clone().sub(start);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, direction.length(), width), material);
    mesh.position.copy(start.add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  };
  const raised = (fraction, height) => {
    const point = at(fraction);
    return { ...point, y: flightHeightAt(flight, point) + height };
  };
  const result = [
    beam(raised(0, STAIRS.parapetHeight), raised(1, STAIRS.parapetHeight), RAIL_THICKNESS),
    beam(raised(0, STAIRS.parapetHeight / 2), raised(1, STAIRS.parapetHeight / 2), RAIL_THICKNESS * 0.6),
  ];
  const length = alongX ? rect.x1 - rect.x0 : rect.z1 - rect.z0;
  const intervals = Math.max(1, Math.ceil(length / 0.75));
  for (let index = 0; index <= intervals; index++) {
    const fraction = index / intervals;
    result.push(beam(raised(fraction, 0), raised(fraction, STAIRS.parapetHeight), RAIL_THICKNESS * 0.7));
  }
  return result;
}

/** The drawing uses the same linear slope as StairFlight's collision model. */
function flightHeightAt({ rect, rises, low, high }, point) {
  if (!rises) return low;
  const run = rises.x !== 0 ? rect.x1 - rect.x0 : rect.z1 - rect.z0;
  const origin = rises.x !== 0 ? rect.x0 : rect.z0;
  const coordinate = rises.x !== 0 ? point.x : point.z;
  const fraction = (rises.x + rises.z) > 0 ? (coordinate - origin) / run : 1 - (coordinate - origin) / run;
  return low + fraction * (high - low);
}

/**
 * @param {StairFlightPlan} flight
 * @returns {{ rect: Rect, top: number }[]} The flight's steps from the foot up, each with the height of its tread;
 *   a landing is a single step.
 */
function stepsOf({ rect, rises, low, high }) {
  if (!rises) return [{ rect, top: low }];
  const count = Math.ceil((high - low) / STAIRS.maxRiser);
  const { x0, z0, x1, z1 } = rect;
  // Measured from the foot, a share of the way up the flight.
  const slice = (from, to) => {
    if (rises.x !== 0) {
      const [a, b] = rises.x > 0 ? [x0 + from * (x1 - x0), x0 + to * (x1 - x0)] : [x1 - to * (x1 - x0), x1 - from * (x1 - x0)];
      return { x0: a, z0, x1: b, z1 };
    }
    const [a, b] = rises.z > 0 ? [z0 + from * (z1 - z0), z0 + to * (z1 - z0)] : [z1 - to * (z1 - z0), z1 - from * (z1 - z0)];
    return { x0, z0: a, x1, z1: b };
  };
  return Array.from({ length: count }, (_, i) => ({ rect: slice(i / count, (i + 1) / count), top: low + ((high - low) * (i + 1)) / count }));
}

/**
 * @param {TileMap} tileMap
 * @returns {Map<string, Rect[]>} Every tile's rectangle, grouped by tile character.
 */
function groupTileRects(tileMap) {
  const rectsByTile = new Map();
  tileMap.forEachTile((tile, rect) => {
    if (!rectsByTile.has(tile)) rectsByTile.set(tile, []);
    rectsByTile.get(tile).push(rect);
  });
  return rectsByTile;
}

/**
 * @param {Rect} rect - A tile.
 * @param {TileMap} tileMap
 * @param {readonly string[]} tiles
 * @returns {FloorPoint[]} The Compass directions in which the next tile is one of `tiles`.
 */
function sidesFacing({ x0, z0, x1, z1 }, tileMap, tiles) {
  const centerX = (x0 + x1) / 2, centerZ = (z0 + z1) / 2, size = x1 - x0;
  return Object.values(Compass).filter((side) => tiles.includes(tileMap.tileAt(centerX + side.x * size, centerZ + side.z * size)));
}

/**
 * @param {Rect[]} rects
 * @returns {Box[]} The rectangles as boxes from `y0` up to `y1`.
 */
const raise = (rects, y0, y1) => rects.map((rect) => ({ ...rect, y0, y1 }));
