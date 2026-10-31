import * as THREE from 'three';
import { createTorchModel } from './torchModel.js';
import { createCameraModel } from './cameraModel.js';

const material = (color, emissive = 0) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.35, roughness: 0.65 });
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  return mesh;
};

/** Tool geometry is shared by the held view and floor pickups. Forward is -z. */
export function createEquipmentModel(kind, cameraScreenTexture) {
  if (kind === 'flashlight') return createTorchModel();
  if (kind === 'camera') return createCameraModel(cameraScreenTexture);
  const group = new THREE.Group();
  const width = .04, height = .08, depth = .025;
  group.add(
    box(width, height, depth, material(0x547752, 0x224f36)),
    box(width * .7, .009, depth * .7, material(0xc7b277), 0, height / 2 + .0045),
  );
  return group;
}
