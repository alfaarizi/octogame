import * as THREE from 'three';
import { createBoxMeshFromBounds } from '../meshes.js';

/** Trees and shrubs with grounded volume. Their authored footprint remains the collision shape. */
export function createLandscapeProps(pieces) {
  return pieces.map((piece) => piece.visual === 'palm' ? createPalm(piece) : createShrub(piece));
}

function createPalm(piece) {
  const trunkBounds = piece.parts[0];
  const x = (trunkBounds.x0 + trunkBounds.x1) / 2;
  const z = (trunkBounds.z0 + trunkBounds.z1) / 2;
  const height = trunkBounds.y1 - trunkBounds.y0;
  const group = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: trunkBounds.color, roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.1, .17, height, 9), bark);
  trunk.position.set(x, trunkBounds.y0 + height / 2, z);
  trunk.castShadow = trunk.receiveShadow = true;
  group.add(trunk);
  const foliage = new THREE.MeshStandardMaterial({ color: 0x3d642e, roughness: 1, side: THREE.DoubleSide });
  for (let index = 0; index < 8; index++) {
    const angle = (index / 8) * Math.PI * 2;
    const forward = { x: Math.cos(angle), z: Math.sin(angle) };
    const sideways = { x: -forward.z, z: forward.x };
    const crown = trunkBounds.y1;
    const points = [
      [0, .02, 0], [.55, .15, -.11], [.55, .15, .11],
      [1.05, -.05, -.18], [1.05, -.05, .18], [1.55, -.58, 0],
    ];
    const positions = points.flatMap(([along, up, across]) => [
      x + forward.x * along + sideways.x * across, crown + up,
      z + forward.z * along + sideways.z * across,
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex([0, 1, 2, 1, 3, 4, 1, 4, 2, 3, 5, 4]);
    geometry.computeVertexNormals();
    const leaf = new THREE.Mesh(geometry, foliage);
    leaf.castShadow = leaf.receiveShadow = true;
    group.add(leaf);
  }
  return group;
}

function createShrub(piece) {
  const box = piece.parts[0];
  const group = new THREE.Group();
  const x = (box.x0 + box.x1) / 2, z = (box.z0 + box.z1) / 2;
  const width = box.x1 - box.x0, depth = box.z1 - box.z0;
  const isPlanter = box.y1 - box.y0 < .4;
  if (isPlanter) {
    const planter = createBoxMeshFromBounds(box, new THREE.MeshStandardMaterial({ color: box.color, roughness: 1 }));
    planter.castShadow = planter.receiveShadow = true;
    group.add(planter);
  }
  const leaf = new THREE.MeshStandardMaterial({ color: isPlanter ? 0x304d27 : box.color, roughness: 1 });
  const radius = Math.min(.42, Math.max(width, depth) * .42);
  for (const offset of [-.27, 0, .27]) {
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), leaf);
    bush.scale.set(1, .85, 1);
    bush.position.set(x + offset * (width > depth ? 1 : 0), box.y0 + (isPlanter ? .35 : 0) + radius * .8, z + offset * (depth >= width ? 1 : 0));
    bush.castShadow = bush.receiveShadow = true;
    group.add(bush);
  }
  return group;
}
