import * as THREE from 'three';
import { createArchitecture } from './architecture.js';
import { createFurnishings } from './furnishings.js';

/** @typedef {import('../../../models/level/parseLevel.js').Level} Level */
/** @typedef {import('../../../models/world/TileMap.js').TileMap} TileMap */

/**
 * The office's static scenery on every floor: the building itself, and the furniture and portraits in it.
 * @param {Level} level
 * @param {readonly TileMap[]} tileMaps - Each floor's tiles, in the same order as `level.floors`.
 * @returns {THREE.Group}
 */
export function createOfficeModel(level, tileMaps) {
  const office = new THREE.Group();
  office.add(...createArchitecture(level, tileMaps), ...createFurnishings(level.floors));
  return office;
}
