import * as THREE from 'three';

const skin = new THREE.MeshStandardMaterial({ color: 0xa87559, roughness: .92 });
const skinShade = new THREE.MeshStandardMaterial({ color: 0x90634d, roughness: .96 });
const sleeve = new THREE.MeshStandardMaterial({ color: 0x202b30, roughness: .98 });
const cuff = new THREE.MeshStandardMaterial({ color: 0x172024, roughness: 1 });
const vertical = new THREE.Vector3(0, 1, 0);
const palmGeometry = new THREE.SphereGeometry(1, 12, 8);

function addPalm(group, position, scale) {
  const palm = new THREE.Mesh(palmGeometry, skin);
  palm.position.set(...position);
  palm.scale.set(...scale);
  group.add(palm);
}

function addFinger(group, start, end, radius, material = skin) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const direction = to.clone().sub(from);
  const bone = new THREE.Mesh(new THREE.CylinderGeometry(radius * .78, radius, direction.length(), 8), material);
  bone.position.copy(from).add(to).multiplyScalar(.5);
  bone.quaternion.setFromUnitVectors(vertical, direction.normalize());
  group.add(bone);
  const joint = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), material);
  joint.position.copy(from);
  group.add(joint);
}

function addSleeve(group, x, y, z, angle = 0) {
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(.022, .025, .039, 8), skinShade);
  wrist.position.set(x, y + .083, z - .025);
  group.add(wrist);
  const seam = new THREE.Mesh(new THREE.CylinderGeometry(.031, .034, .024, 8), cuff);
  seam.position.set(x, y + .055, z);
  group.add(seam);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(.032, .048, .17, 8), sleeve);
  arm.position.set(x, y - .03, z + .025);
  arm.rotation.z = angle;
  group.add(arm);
}

function createCameraSideHand(side) {
  const hand = new THREE.Group();
  addPalm(hand, [side * .145, -.037, .079], [.023, .044, .025]);
  addSleeve(hand, side * .164, -.177, .117, side * .16);

  // Four fingertips wrap around the front edge and stay clear of the LCD.
  for (const [height, radius] of [[-.074, .006], [-.052, .007], [-.03, .007], [-.008, .007]]) {
    addFinger(hand, [side * .149, height, .062], [side * .139, height + .005, .028], radius);
    addFinger(hand, [side * .139, height + .005, .028], [side * .123, height + .007, -.006], radius * .93);
  }
  addFinger(hand, [side * .137, -.011, .103], [side * .111, -.005, .088], .010);
  addFinger(hand, [side * .111, -.005, .088], [side * .096, -.025, .075], .008);
  return hand;
}

/** Two hands brace the camera sides; the right index finger reaches the shutter. */
export function createCameraHands() {
  const hands = new THREE.Group();
  hands.add(createCameraSideHand(-1), createCameraSideHand(1));
  addFinger(hands, [.145, .014, .078], [.112, .057, .045], .008);
  addFinger(hands, [.112, .057, .045], [.067, .089, .012], .007);
  return hands;
}

/** Palm and forearm anchor shared by the flashlight and battery grips. */
function addRightHandBase(hand) {
  addPalm(hand, [.008, -.037, .035], [.033, .044, .034]);
  addSleeve(hand, .015, -.16, .08, .09);
}

/** The battery is pinched between the thumb in front and the fingers behind. */
export function createBatteryHand() {
  const hand = new THREE.Group();
  addRightHandBase(hand);
  // Short thumb on the near side, pressing across the battery face closest to the camera.
  addFinger(hand, [.048, -.022, .045], [.03, .002, .055], .010);
  addFinger(hand, [.03, .002, .055], [.012, .014, .052], .008);
  // The remaining fingers curl behind the battery, their tips showing above its far edge.
  for (const [x, radius] of [[-.024, .0062], [-.006, .0075], [.012, .008], [.03, .008]]) {
    addFinger(hand, [x, -.03, .03], [x, -.004, .006], radius);
    addFinger(hand, [x, -.004, .006], [x + .004, .578 * x + .038, .01], radius * .85);
  }
  return hand;
}

/** A right hand grips the flashlight handle from below. */
export function createFlashlightHand() {
  const hand = new THREE.Group();
  addRightHandBase(hand);
  // Keep the A+ lean and move the entire four-finger grip toward the screen.
  const screenOffset = .02;
  for (const [depth, radius] of [[-.02, .009], [.004, .009], [.028, .0085], [.052, .0075]]) {
    addFinger(hand, [-.032, -.021, depth + screenOffset], [-.009, .014, depth + screenOffset + .020], radius);
  }
  addFinger(hand, [.025, -.021, .055], [.022, .012, .015], .010);
  return hand;
}
