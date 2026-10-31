import * as THREE from 'three';

const bodyTexture = createBodyTexture();
const shell = new THREE.MeshStandardMaterial({ map: bodyTexture, color: 0xffffff, emissive: 0x151d1f, emissiveIntensity: .3, roughness: .86, metalness: .12 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x171d1f, roughness: .98 });
const metal = new THREE.MeshStandardMaterial({ color: 0x6d7778, roughness: .34, metalness: .8 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0x10191d, roughness: .12, metalness: .18, clearcoat: 1 });
const markings = new THREE.MeshBasicMaterial({ color: 0xb6c4bd });
const statusLight = new THREE.MeshBasicMaterial({ color: 0xa94335 });
const labelTexture = createLabelTexture();

function createBodyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  context.fillStyle = '#293033';
  context.fillRect(0, 0, 64, 64);
  // Fine molded-plastic grain, kept subtle enough to read at view-model size.
  for (let index = 0; index < 900; index++) {
    const x = (index * 37) % 64;
    const y = (index * 53 + Math.floor(index / 64) * 19) % 64;
    context.fillStyle = index % 3 ? '#323a3c' : '#20272a';
    context.fillRect(x, y, 1, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createLabelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  context.fillStyle = '#c5d1cb';
  context.font = 'bold 40px monospace';
  context.fillText('MF-35', 8, 46);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function box(group, width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

function ring(group, radius, tube, material, z) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 32), material);
  mesh.position.set(0, .004, z);
  group.add(mesh);
}

/** A compact digital camera. The rear LCD receives the same live image used by the viewfinder. */
export function createCameraModel(screenTexture) {
  const camera = new THREE.Group();
  box(camera, .252, .149, .091, shell, 0, 0, 0);
  box(camera, .042, .142, .101, rubber, .103, -.002, .004);
  box(camera, .059, .025, .057, shell, -.066, .085, -.004);
  box(camera, .028, .009, .028, metal, -.065, .103, -.002);
  box(camera, .057, .008, .026, metal, .062, .079, -.012);
  box(camera, .035, .007, .019, rubber, .062, .085, -.012);

  // The front barrel is concentric and recessed, with separate knurled rings.
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.056, .061, .064, 32), rubber);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, .004, -.071);
  camera.add(barrel);
  ring(camera, .057, .005, metal, -.103);
  ring(camera, .045, .004, rubber, -.107);
  ring(camera, .034, .003, metal, -.109);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(.031, 32), glass);
  lens.rotation.y = Math.PI;
  lens.position.set(0, .004, -.112);
  camera.add(lens);
  box(camera, .037, .012, .002, markings, -.091, .039, -.047);
  box(camera, .018, .014, .003, glass, .087, .045, -.048);

  // Opaque LCD housing and a shallow screen prevent the body from showing through.
  box(camera, .166, .110, .009, rubber, -.026, -.006, .051);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(.060, .015), new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, depthWrite: false }));
  label.position.set(-.071, .058, .048);
  camera.add(label);
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(.150, .091),
    new THREE.MeshBasicMaterial({ color: screenTexture ? 0xffffff : 0x18282a, map: screenTexture, toneMapped: false }),
  );
  display.position.set(-.026, -.006, .0562);
  camera.add(display);
  box(camera, .029, .029, .004, rubber, .092, -.008, .052);
  ringButton(camera, .092, -.008, .055);
  box(camera, .014, .004, .003, markings, .092, .047, .050);
  box(camera, .007, .007, .003, statusLight, -.106, .055, .051);
  for (let index = 0; index < 6; index++) {
    box(camera, .002, .011, .002, metal, .124, -.045 + index * .015, .005);
  }
  return camera;
}

function ringButton(group, x, y, z) {
  const dial = new THREE.Mesh(new THREE.TorusGeometry(.011, .002, 6, 20), metal);
  dial.position.set(x, y, z);
  group.add(dial);
}
