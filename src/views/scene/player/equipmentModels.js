import * as THREE from 'three';
import { createTorchModel } from './torchModel.js';

const material = (color, emissive = 0) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.35, roughness: 0.65 });
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  return mesh;
};

/** Geometry is shared by the right-hand view and floor pickups. Forward is -z. */
export function createEquipmentModel(kind) {
  if (kind === 'flashlight') return createTorchModel();
  const group = new THREE.Group();
  if (kind === 'camera') {
    group.add(box(.24, .15, .09, material(0x252c2f)), box(.07, .04, .07, material(0x414747), .07, .085),
      box(.14, .09, .005, material(0x426664, 0x426664), -.025, 0, .048),
      box(.06, .025, .015, material(0xe0e3d9, 0x697c78), -.07, .049, -.05));
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .07, 20), material(0x101d26));
    lens.rotation.x = Math.PI / 2;
    lens.position.z = -.07;
    group.add(lens);
  } else {
    group.add(box(.07, .14, .045, material(0x547752, 0x224f36)), box(.05, .015, .03, material(0xc7b277), 0, .075));
  }
  return group;
}

/** A gloved right hand beneath the tool, with a short sleeve at the edge of the frame. */
export function createRightHand() {
  const group = new THREE.Group();
  group.add(box(.09, .1, .13, material(0x454743), .015, -.07, .06),
    box(.085, .17, .12, material(0x1f2a30), .025, -.19, .11));
  return group;
}
