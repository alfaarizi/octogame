import * as THREE from 'three';
import { Compass, edgeStrip } from '../../utils.js';
import { RAIL_THICKNESS } from '../../world/StairFlight.js';
import { Tile, TileMap } from '../../world/TileMap.js';
import { createBoxMesh, createFlatSurfaceGeometry, createMergedBoxMesh } from '../meshes.js';
import {
  createConcreteTexture,
  createGardenPavingTexture,
  createOfficeFloorTexture,
  createOfficeWallTexture,
  createPortraitTexture,
  createStoneTileTexture,
} from './textures.js';

/** @typedef {import('../../data/officeLayout.js').PlacedFloor} PlacedFloor */
/** @typedef {import('../../data/office/floorKit.js').FurniturePiece} FurniturePiece */
/** @typedef {import('../../types.js').Box} Box */
/** @typedef {import('../../types.js').Point3} Point3 */
/** @typedef {import('../../types.js').Rect} Rect */
/** @typedef {import('../../world/StairFlight.js').StairFlightPlan} StairFlightPlan */

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
/** Rugs and other parts this thin don't cast shadows. */
const FLAT_PART_HEIGHT = 0.05;
const PORTRAIT = Object.freeze({ frameWidth: 0.8, frameHeight: 1.0, frameDepth: 0.05, pictureWidth: 0.66, pictureHeight: 0.86, centerHeight: 1.75 });
/** @type {readonly string[]} Tiles with a flat floor. */
const FLOOR_TILES = Object.freeze([Tile.FLOOR, Tile.CARPORT, Tile.WET_FLOOR, Tile.PAVING, Tile.GARDEN]);
/** @type {ReadonlySet<string>} Tiles with a roof over them when no floor stands above. */
const ROOFED_TILES = new Set([Tile.FLOOR, Tile.WET_FLOOR, Tile.CARPORT, Tile.STAIRS, Tile.VOID]);
/** @type {readonly string[]} Openings in the floor, railed off wherever they meet a flat floor. */
const OPENING_TILES = Object.freeze([Tile.VOID, Tile.PIT]);

/**
 * The office's static scenery on every floor: walls, floors, ceilings, stairs, railings, furniture and portraits.
 * @param {readonly PlacedFloor[]} floors - From the lowest up.
 * @param {object} dimensions
 * @param {number} dimensions.tileSize
 * @param {number} dimensions.storeyHeight - From one floor up to the next, which is also each floor's ceiling height.
 * @param {number} dimensions.lowWallHeight - For low walls and the street fence.
 * @returns {THREE.Group}
 */
export function createOfficeModel(floors, { tileSize, storeyHeight, lowWallHeight }) {
  const tileMaps = floors.map((floor) => new TileMap(floor.tiles, tileSize));
  /** @type {Storey[]} */
  const storeys = floors.map(({ elevation }, index) => ({
    elevation,
    tileMap: tileMaps[index],
    tileMapAbove: tileMaps[index + 1],
    rectsByTile: groupTileRects(tileMaps[index]),
  }));
  const wallsOf = (tile, height) =>
    storeys.flatMap(({ elevation, rectsByTile }) => raise(rectsByTile.get(tile) ?? [], elevation, elevation + height));
  const wallMaterial = new THREE.MeshStandardMaterial({ map: createOfficeWallTexture(), roughness: 0.95 });

  const office = new THREE.Group();
  office.add(
    createWalls(wallsOf(Tile.WALL, storeyHeight), wallMaterial),
    createWalls(wallsOf(Tile.LOW_WALL, lowWallHeight), new THREE.MeshStandardMaterial({ map: createConcreteTexture(), roughness: 1 })),
    ...createFloors(storeys),
    ...createCeilings(storeys, storeyHeight),
    createRailings(storeys),
    createStairs(floors, wallMaterial),
    ...createFurniture(floors.flatMap((floor) => floor.furniture)),
    ...floors.flatMap((floor) => floor.portraits).flatMap(createPortrait),
  );
  return office;
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
    { tile: Tile.FLOOR, material: floor({ map: officeFloor, roughness: 0.6 }) },
    { tile: Tile.CARPORT, material: floor({ map: officeFloor, color: 0xc4bcae, roughness: 0.8 }) },
    { tile: Tile.WET_FLOOR, material: floor({ map: stone, roughness: 0.5 }) },
    { tile: Tile.PAVING, material: floor({ map: stone, roughness: 0.9 }) },
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

function createSurface(rects, y, facesUp, material) {
  const surface = new THREE.Mesh(createFlatSurfaceGeometry(rects, y, { facesUp, textureMeters: TEXTURE_METERS }), material);
  surface.receiveShadow = true;
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
    for (const rect of OPENING_TILES.flatMap((tile) => rectsByTile.get(tile) ?? [])) {
      for (const side of sidesFacing(rect, tileMap, FLOOR_TILES)) {
        const rail = edgeStrip(rect, side, thickness);
        const post = { x0: rail.x0, z0: rail.z0, x1: rail.x0 + thickness, z1: rail.z0 + thickness };
        boxes.push(
          { ...rail, y0: elevation + height - thickness, y1: elevation + height },
          { ...rail, y0: elevation + middleHeight - thickness / 2, y1: elevation + middleHeight + thickness / 2 },
          { ...post, y0: elevation - PIT_DEPTH, y1: elevation + height },
        );
      }
    }
  }
  const railings = createMergedBoxMesh(boxes, new THREE.MeshStandardMaterial({ color: 0x4a4f55, roughness: 0.5, metalness: 0.6 }));
  railings.castShadow = true;
  return railings;
}

/**
 * Every flight cut into solid steps standing on the floor it rises from, with a parapet along each open side.
 * @param {readonly PlacedFloor[]} floors
 */
function createStairs(floors, parapetMaterial) {
  const steps = [], parapets = [];
  for (const { elevation, stairs } of floors) {
    for (const flight of stairs) {
      for (const { rect, top } of stepsOf(flight)) {
        steps.push({ ...rect, y0: elevation, y1: top });
        for (const side of flight.rails) parapets.push({ ...edgeStrip(rect, side, RAIL_THICKNESS), y0: elevation, y1: top + STAIRS.parapetHeight });
      }
    }
  }
  const stairs = new THREE.Group();
  stairs.add(createMergedBoxMesh(steps, new THREE.MeshStandardMaterial({ color: 0x6f6a63, roughness: 0.8 })));
  stairs.add(createMergedBoxMesh(parapets, parapetMaterial));
  for (const mesh of stairs.children) mesh.castShadow = mesh.receiveShadow = true;
  return stairs;
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
 * Every furniture part, merged into one mesh per color (and per whether it casts shadows).
 * @param {readonly FurniturePiece[]} furniture
 */
function createFurniture(furniture) {
  const partsByLook = new Map();
  for (const part of furniture.flatMap((piece) => piece.parts)) {
    const castsShadow = part.y1 - part.y0 > FLAT_PART_HEIGHT;
    const key = `${part.color}:${castsShadow}`;
    if (!partsByLook.has(key)) partsByLook.set(key, { color: part.color, castsShadow, parts: [] });
    partsByLook.get(key).parts.push(part);
  }
  return [...partsByLook.values()].map(({ color, castsShadow, parts }) => {
    const mesh = createMergedBoxMesh(parts, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    mesh.castShadow = castsShadow;
    mesh.receiveShadow = true;
    return mesh;
  });
}

/**
 * A framed portrait hanging on the south-facing wall face at (x, z), on the floor at height y.
 * @param {Point3} spot
 */
function createPortrait({ x, y, z }) {
  const centerY = y + PORTRAIT.centerHeight;
  const frame = createBoxMesh(
    { width: PORTRAIT.frameWidth, height: PORTRAIT.frameHeight, depth: PORTRAIT.frameDepth },
    { x, y: centerY, z: z + PORTRAIT.frameDepth / 2 },
    new THREE.MeshStandardMaterial({ color: 0x4a3514, roughness: 0.5, metalness: 0.4 }),
  );
  const picture = new THREE.Mesh(
    new THREE.PlaneGeometry(PORTRAIT.pictureWidth, PORTRAIT.pictureHeight),
    new THREE.MeshStandardMaterial({ map: createPortraitTexture(), roughness: 0.9 }),
  );
  picture.position.set(x, centerY, z + PORTRAIT.frameDepth + 0.002);
  return [frame, picture];
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
 * @returns {import('../../types.js').FloorPoint[]} The Compass directions in which the next tile is one of `tiles`.
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
