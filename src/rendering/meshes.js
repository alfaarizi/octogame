import * as THREE from 'three';

/** @typedef {import('../types.js').Box} Box */
/** @typedef {import('../types.js').Point3} Point3 */
/** @typedef {import('../types.js').Rect} Rect */
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
export function createBoxMeshFromBounds(box, material) {
  return new THREE.Mesh(createBoxGeometry(box), material);
}

/**
 * Many boxes drawn as one mesh, which is far cheaper to render than one mesh per box.
 * @param {readonly Box[]} boxes
 * @param {THREE.Material} material
 * @returns {THREE.Mesh}
 */
export function createMergedBoxMesh(boxes, material) {
  const positions = [], normals = [], uvs = [], indices = [];
  for (const box of boxes) {
    const geometry = createBoxGeometry(box);
    const offset = positions.length / 3;
    positions.push(...geometry.attributes.position.array);
    normals.push(...geometry.attributes.normal.array);
    uvs.push(...geometry.attributes.uv.array);
    for (const index of geometry.index.array) indices.push(offset + index);
    geometry.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  merged.setIndex(indices);
  return new THREE.Mesh(merged, material);
}

/**
 * One flat surface covering every rectangle at height `y`, such as all the tiles of one kind of floor.
 * UVs are in meters divided by `textureMeters`, so a repeating texture runs on seamlessly from tile to tile.
 * @param {readonly Rect[]} rects
 * @param {number} y
 * @param {{ facesUp: boolean, textureMeters: number }} options - A floor faces up; a ceiling faces down.
 * @returns {THREE.BufferGeometry}
 */
export function createFlatSurfaceGeometry(rects, y, { facesUp, textureMeters }) {
  const positions = [], normals = [], uvs = [], indices = [];
  const normalY = facesUp ? 1 : -1;
  const u = (meters) => meters / textureMeters;
  for (const { x0, z0, x1, z1 } of rects) {
    const first = positions.length / 3;
    positions.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1);
    for (let corner = 0; corner < 4; corner++) normals.push(0, normalY, 0);
    uvs.push(u(x0), u(z0), u(x1), u(z0), u(x1), u(z1), u(x0), u(z1));
    // Counter-clockwise as seen from the side the surface faces.
    if (facesUp) indices.push(first, first + 3, first + 2, first, first + 2, first + 1);
    else indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

/** @param {Box} box */
function createBoxGeometry({ x0, x1, y0, y1, z0, z1 }) {
  return new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}
