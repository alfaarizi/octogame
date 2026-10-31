import * as THREE from 'three';
import { createBoxMesh, createMergedBoxMesh } from '../meshes.js';
import { createPortraitTexture } from './textures.js';
import { createLandscapeProps } from './landscapeProps.js';
import { createFurnitureMaterial } from './furnitureMaterials.js';

/** @typedef {import('../../../models/level/furniture.js').FurniturePiece} FurniturePiece */
/** @typedef {import('../../../models/level/parseLevel.js').PlacedFloor} PlacedFloor */
/** @typedef {import('../../../types.js').Point3} Point3 */

/** Rugs and other parts this thin don't cast shadows. */
const FLAT_PART_HEIGHT = 0.05;
const PORTRAIT = Object.freeze({ frameWidth: 0.8, frameHeight: 1.0, frameDepth: 0.05, pictureWidth: 0.66, pictureHeight: 0.86, centerHeight: 1.75 });

/**
 * What stands in the building on every floor: the furniture and the portraits on the walls.
 * @param {readonly PlacedFloor[]} floors
 * @returns {THREE.Object3D[]}
 */
export function createFurnishings(floors) {
  const furniture = floors.flatMap((floor) => floor.furniture);
  return [...createFurniture(furniture.filter((piece) => piece.visual === null)),
    ...createLandscapeProps(furniture.filter((piece) => piece.visual !== null)),
    ...floors.flatMap((floor) => floor.portraits).flatMap(createPortrait)];
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
    const mesh = createMergedBoxMesh(parts, createFurnitureMaterial(color));
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
