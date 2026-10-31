import * as THREE from 'three';
import { createMergedBoxMesh } from '../meshes.js';
import { createLabel } from '../textLabels.js';
import { CEILING_SLAB_THICKNESS } from './sceneDimensions.js';

/** Deterministic dressing, batched by material. No per-frame lights or collision-only obstacles. */
export function createAtmosphere(level, tileMaps) {
  const group = new THREE.Group();
  const pipes = [], papers = [], ceilingFixtures = [], dust = [];
  for (const [floorIndex, floor] of level.floors.entries()) {
    const map = tileMaps[floorIndex];
    const ceilingY = floor.elevation + level.storeyHeight - CEILING_SLAB_THICKNESS;
    map.forEachTile((tile, rect) => {
      if (tile !== '.') return;
      const x = (rect.x0 + rect.x1) / 2, z = (rect.z0 + rect.z1) / 2;
      const cellX = Math.round(x * 2), cellZ = Math.round(z * 2);
      const seed = (cellX * 73 + cellZ * 137 + floorIndex * 43) % 101;
      if (seed < 3) papers.push({ x0: x - .09, x1: x + .09, z0: z - .14, z1: z + .14, y0: floor.elevation + .001, y1: floor.elevation + .003 });
      if (cellZ % 8 === 2) pipes.push({ x0: rect.x0, x1: rect.x1, z0: z - .025, z1: z + .025, y0: ceilingY - .07, y1: ceilingY });
      if (cellX % 8 === 3 && cellZ % 8 === 3) ceilingFixtures.push({ x0: x - .2, x1: x + .2, z0: z - .12, z1: z + .12, y0: ceilingY - .1, y1: ceilingY });
      if (seed < 14) dust.push(x, floor.elevation + .5 + seed / 8, z);
    });
  }
  for (const [boxes, color] of [[pipes, 0x3f4847], [papers, 0x9d9e88], [ceilingFixtures, 0x676e69]]) {
    const mesh = createMergedBoxMesh(boxes, new THREE.MeshStandardMaterial({ color, roughness: .95 }));
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(dust, 3));
  group.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xa0b7ac, size: .016, transparent: true, opacity: .2, depthWrite: false })));
  for (const [text, x, y, z, yaw] of [
    ['NIGHT SHIFT / 02:13', 8, 2.15, 9.02, Math.PI], ['WORKSHOP', 17, 2.3, .51, 0],
    ['ARCHIVE / B1', 19, -1.38, 7.42, 0], ['EXIT →', 18, 1.9, 21.95, Math.PI],
    ['NO SIGNAL', 20.5, 1.0, 12.69, 0], ['KEEP QUIET', 3, 5.1, .51, 0],
  ]) {
    const label = createLabel(text, 1.05, .24, '#9ca996', '#172824');
    label.position.set(x, y, z); label.rotation.y = yaw; group.add(label);
  }
  // Tyres sit inside the already-collidable vehicle footprints.
  const rubber = new THREE.MeshStandardMaterial({ color: 0x101414, roughness: 1 });
  for (const [x, z, width, length] of [[7.8, 17, 2, 3.6], [17.625, 18.65, 1.25, 2.9]]) {
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .15, 12), rubber);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x + side * (width / 2 - .08), .32, z + end * length * .33); group.add(wheel);
    }
  }
  return group;
}
