import * as THREE from 'three';
import { createTorchModel } from './torchModel.js';
import { createCameraModel } from './cameraModel.js';

const material = (color, emissive = 0) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.35, roughness: 0.65 });
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  return mesh;
};

/** Geometry is shared by the right-hand view and floor pickups. Forward is -z. */
export function createEquipmentModel(kind, cameraScreenTexture) {
  if (kind === 'flashlight') return createTorchModel();
  if (kind === 'camera') return createCameraModel(cameraScreenTexture);
  const group = new THREE.Group();
  group.add(box(.07, .14, .045, material(0x547752, 0x224f36)), box(.05, .015, .03, material(0xc7b277), 0, .075));
  return group;
}

/** A gloved right hand beneath the tool, with a short sleeve at the edge of the frame. */
export function createRightHand() {
  const group = new THREE.Group();
  group.add(box(.09, .1, .13, material(0x454743), .015, -.07, .06),
    box(.085, .17, .12, material(0x1f2a30), .025, -.19, .11));
  return group;
}
