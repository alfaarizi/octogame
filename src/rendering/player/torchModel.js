import * as THREE from 'three';

/** The flashlight held in the bottom-right of the view, pointing away from the camera (-z). */
export function createTorchModel() {
  const metal = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.45, metalness: 0.6 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.14, 16), metal);
  handle.rotation.x = Math.PI / 2;
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.021, 0.05, 16), metal);
  head.rotation.x = Math.PI / 2;
  head.position.z = -0.09;
  const torch = new THREE.Group();
  torch.add(handle, head);
  torch.rotation.set(0.06, 0.1, 0);
  return torch;
}
