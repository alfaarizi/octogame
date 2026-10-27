import * as THREE from 'three';

/** @typedef {import('../types.js').Box} Box */
/** @typedef {import('../types.js').Point3} Point3 */
/** @typedef {import('../types.js').Size3} Size3 */

/**
 * @param {Size3} size
 * @param {Point3} center
 * @param {THREE.Material} material
 * @returns {THREE.Mesh} A box mesh of `size`, centered on `center`.
 */
export function createBoxMesh({ width, height, depth }, center, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.copy(center);
  return mesh;
}

/**
 * @param {Box} box
 * @param {THREE.Material} material
 * @returns {THREE.Mesh} A box mesh exactly filling `box`, the way furniture is laid out.
 */
export function createBoxMeshFromBounds({ x0, x1, y0, y1, z0, z1 }, material) {
  return createBoxMesh(
    { width: x1 - x0, height: y1 - y0, depth: z1 - z0 },
    { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2 },
    material,
  );
}
