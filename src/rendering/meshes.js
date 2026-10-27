import * as THREE from 'three';

/** A box mesh of `size` [width, height, depth] centered on `center` [x, y, z]. */
export function createBoxMesh(size, center, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...center);
  return mesh;
}

/** A box mesh exactly filling `bounds` ({ x0, x1, y0, y1, z0, z1 }), the way furniture is laid out. */
export function createBoxMeshFromBounds({ x0, x1, y0, y1, z0, z1 }, material) {
  return createBoxMesh([x1 - x0, y1 - y0, z1 - z0], [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], material);
}
