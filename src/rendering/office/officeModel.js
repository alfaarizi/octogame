import * as THREE from 'three';
import { Tile } from '../../world/TileMap.js';
import { createBoxMesh, createFlatSurfaceGeometry, createMergedBoxMesh } from '../meshes.js';
import {
  createConcreteTexture,
  createGardenPavingTexture,
  createOfficeFloorTexture,
  createOfficeWallTexture,
  createPortraitTexture,
  createStoneTileTexture,
} from './textures.js';

/** @typedef {import('../../data/officeLayout.js').FurniturePiece} FurniturePiece */
/** @typedef {import('../../types.js').FloorPoint} FloorPoint */
/** @typedef {import('../../types.js').Rect} Rect */
/** @typedef {import('../../world/TileMap.js').TileMap} TileMap */

const TEXTURE_METERS = 2;
/** How far below the floor the stairwell and ramp openings appear to go. */
const PIT_DEPTH = 0.6;
const RAILING = Object.freeze({ height: 1.0, middleHeight: 0.5, thickness: 0.05, postWidth: 0.05 });
/** Rugs and other parts this thin don't cast shadows. */
const FLAT_PART_HEIGHT = 0.05;
const PORTRAIT = Object.freeze({ frameWidth: 0.8, frameHeight: 1.0, frameDepth: 0.05, pictureWidth: 0.66, pictureHeight: 0.86, centerHeight: 1.75 });
const ROOFED_TILES = new Set([Tile.FLOOR, Tile.WET_FLOOR, Tile.CARPORT, Tile.STAIRWELL]);
const PIT_TILES = new Set([Tile.STAIRWELL, Tile.RAMP]);

/**
 * The office's static scenery: walls, floors, ceilings, railings, furniture and portraits.
 * @param {TileMap} tileMap
 * @param {object} office
 * @param {readonly FurniturePiece[]} office.furniture
 * @param {readonly FloorPoint[]} office.portraits
 * @param {number} office.wallHeight
 * @param {number} office.lowWallHeight - For low walls and the street fence.
 * @returns {THREE.Group}
 */
export function createOfficeModel(tileMap, { furniture, portraits, wallHeight, lowWallHeight }) {
  const rectsByTile = groupTileRects(tileMap);
  const rectsOf = (tiles) => [...tiles].flatMap((tile) => rectsByTile.get(tile) ?? []);
  const office = new THREE.Group();
  office.add(
    createWalls(rectsOf([Tile.WALL]), new THREE.MeshStandardMaterial({ map: createOfficeWallTexture(), roughness: 0.95 }), wallHeight),
    createWalls(rectsOf([Tile.LOW_WALL]), new THREE.MeshStandardMaterial({ map: createConcreteTexture(), roughness: 1 }), lowWallHeight),
    ...createFloors(rectsByTile),
    createSurface(rectsOf(ROOFED_TILES), wallHeight, false, new THREE.MeshStandardMaterial({ color: 0x1d1a17, roughness: 1 })),
    createRailings(tileMap, rectsOf(PIT_TILES)),
    ...createFurniture(furniture),
    ...portraits.flatMap(createPortrait),
  );
  return office;
}

/** One box per tile, all drawn as a single instanced mesh. */
function createWalls(rects, material, height) {
  const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, height, 1), material, rects.length);
  const placement = new THREE.Matrix4();
  rects.forEach(({ x0, z0, x1, z1 }, index) => {
    placement.makeScale(x1 - x0, 1, z1 - z0).setPosition((x0 + x1) / 2, height / 2, (z0 + z1) / 2);
    walls.setMatrixAt(index, placement);
  });
  walls.castShadow = walls.receiveShadow = true;
  return walls;
}

/** One surface per kind of floor, and the bottoms of the openings down to the basement. */
function createFloors(rectsByTile) {
  const officeFloor = createOfficeFloorTexture(), stone = createStoneTileTexture();
  const looks = [
    { tile: Tile.FLOOR, look: { map: officeFloor, roughness: 0.6 } },
    { tile: Tile.CARPORT, look: { map: officeFloor, color: 0xc4bcae, roughness: 0.8 } },
    { tile: Tile.WET_FLOOR, look: { map: stone, roughness: 0.5 } },
    { tile: Tile.PAVING, look: { map: stone, roughness: 0.9 } },
    { tile: Tile.GARDEN, look: { map: createGardenPavingTexture(), roughness: 1 } },
  ];
  const pitBottom = new THREE.MeshStandardMaterial({ color: 0x0b0a09, roughness: 1 });
  return [
    ...looks.map(({ tile, look }) => createSurface(rectsByTile.get(tile) ?? [], 0, true, new THREE.MeshStandardMaterial(look))),
    ...[...PIT_TILES].map((tile) => createSurface(rectsByTile.get(tile) ?? [], -PIT_DEPTH, true, pitBottom)),
  ];
}

function createSurface(rects, y, facesUp, material) {
  const surface = new THREE.Mesh(createFlatSurfaceGeometry(rects, y, { facesUp, textureMeters: TEXTURE_METERS }), material);
  surface.receiveShadow = true;
  return surface;
}

/** A rail along every edge where a stairwell or ramp opening meets ground you can walk on. */
function createRailings(tileMap, pitRects) {
  const { height, middleHeight, thickness, postWidth } = RAILING;
  const boxes = [];
  for (const rect of pitRects) {
    for (const edge of edgesOf(rect)) {
      if (tileMap.isBlocked(edge.outsideX, edge.outsideZ)) continue;
      const { x0, z0, x1, z1 } = edge.line;
      const halfX = x0 === x1 ? thickness / 2 : 0, halfZ = z0 === z1 ? thickness / 2 : 0;
      const rail = (y0, y1) => ({ x0: x0 - halfX, z0: z0 - halfZ, x1: x1 + halfX, z1: z1 + halfZ, y0, y1 });
      boxes.push(
        rail(height - thickness, height),
        rail(middleHeight - thickness / 2, middleHeight + thickness / 2),
        { x0: x0 - postWidth / 2, z0: z0 - postWidth / 2, x1: x0 + postWidth / 2, z1: z0 + postWidth / 2, y0: -PIT_DEPTH, y1: height },
      );
    }
  }
  const railings = createMergedBoxMesh(boxes, new THREE.MeshStandardMaterial({ color: 0x4a4f55, roughness: 0.5, metalness: 0.6 }));
  railings.castShadow = true;
  return railings;
}

/** Every furniture part, merged into one mesh per color (and per whether it casts shadows). */
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
 * A framed portrait hanging on the south-facing wall face at (x, z).
 * @param {FloorPoint} spot
 */
function createPortrait({ x, z }) {
  const frame = createBoxMesh(
    { width: PORTRAIT.frameWidth, height: PORTRAIT.frameHeight, depth: PORTRAIT.frameDepth },
    { x, y: PORTRAIT.centerHeight, z: z + PORTRAIT.frameDepth / 2 },
    new THREE.MeshStandardMaterial({ color: 0x4a3514, roughness: 0.5, metalness: 0.4 }),
  );
  const picture = new THREE.Mesh(
    new THREE.PlaneGeometry(PORTRAIT.pictureWidth, PORTRAIT.pictureHeight),
    new THREE.MeshStandardMaterial({ map: createPortraitTexture(), roughness: 0.9 }),
  );
  picture.position.set(x, PORTRAIT.centerHeight, z + PORTRAIT.frameDepth + 0.002);
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
 * The four sides of a tile, each with a point just beyond it (to check what's next door).
 * @param {Rect} rect
 */
function edgesOf({ x0, z0, x1, z1 }) {
  const midX = (x0 + x1) / 2, midZ = (z0 + z1) / 2, nudge = (x1 - x0) / 2;
  return [
    { line: { x0, z0, x1, z1: z0 }, outsideX: midX, outsideZ: z0 - nudge },
    { line: { x0, z0: z1, x1, z1 }, outsideX: midX, outsideZ: z1 + nudge },
    { line: { x0, z0, x1: x0, z1 }, outsideX: x0 - nudge, outsideZ: midZ },
    { line: { x0: x1, z0, x1, z1 }, outsideX: x1 + nudge, outsideZ: midZ },
  ];
}
