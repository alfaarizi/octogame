import * as THREE from 'three';

const skin = new THREE.MeshStandardMaterial({ color: 0xa87559, roughness: .92 });
const skinShade = new THREE.MeshStandardMaterial({ color: 0x90634d, roughness: .96 });
const nail = new THREE.MeshStandardMaterial({ color: 0xb7836c, roughness: .82 });
const sleeve = new THREE.MeshStandardMaterial({ color: 0x202b30, roughness: .98 });
const cuff = new THREE.MeshStandardMaterial({ color: 0x172024, roughness: 1 });
const vertical = new THREE.Vector3(0, 1, 0);
const palmGeometry = new THREE.SphereGeometry(1, 12, 8);
const roundedPalmGeometry = new THREE.SphereGeometry(1, 20, 14);
// Where the flashlight handle's axis passes through the fist, as [x, z] in the battery grip's frame.
const FIST_HANDLE = [-.003, -.003];
// Held-item draw order for the flashlight: its grip, then the forearm over the grip, then the torch (at the default 0) over both.
const GRIP_LAYER = -2;
const FOREARM_LAYER = -1;

function addPalm(group, position, scale, rotation = 0) {
  const palm = new THREE.Mesh(palmGeometry, skin);
  palm.position.set(...position);
  palm.scale.set(...scale);
  palm.rotation.z = rotation;
  group.add(palm);
}

/** An ellipsoid whose y radius runs along `length` and whose x radius faces `normal`. */
function addPad(group, center, length, normal, radii, material = skin) {
  const y = new THREE.Vector3(...length).normalize();
  const z = new THREE.Vector3(...normal).cross(y).normalize();
  const x = y.clone().cross(z);
  const pad = new THREE.Mesh(roundedPalmGeometry, material);
  pad.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  pad.position.set(...center);
  pad.scale.set(...radii);
  group.add(pad);
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

function addFingertip(group, position, radius) {
  const tip = new THREE.Mesh(palmGeometry, skin);
  tip.position.set(...position);
  tip.scale.set(radius, radius * .85, radius * .8);
  group.add(tip);
}

/**
 * Bends a finger through each joint in turn. Each knuckle sits just inside the bones meeting there,
 * so the finger tapers without bulges and the surfaces never overlap exactly. The base knuckle is full size
 * so the first bone ends round wherever it shows past the palm.
 */
function addCurledFinger(group, joints, radius) {
  const radii = joints.map((_, index) => radius * (1 - .07 * index));
  joints.forEach((joint, index) => {
    const knuckle = new THREE.Mesh(roundedPalmGeometry, skin);
    knuckle.position.set(...joint);
    knuckle.scale.setScalar(radii[index] * (index ? .96 : 1));
    group.add(knuckle);
    if (index > 0) addTaperedSegment(group, joints[index - 1], joint, radii[index - 1], radii[index], skin);
  });
}

/** A nail on the outside of a fingertip, lying along the last finger bone. */
function addNail(group, joints, outward, radius) {
  const tip = new THREE.Vector3(...joints.at(-1));
  const along = tip.clone().sub(new THREE.Vector3(...joints.at(-2))).normalize();
  const center = tip.addScaledVector(along, -radius * .45).addScaledVector(new THREE.Vector3(...outward).normalize(), radius * .62);
  addPad(group, center.toArray(), along.toArray(), outward, [radius * .28, radius * .72, radius * .62], nail);
}

/** A point `degrees` around the flashlight handle as it runs upright through the fist, measured from its right side toward the near side. */
function aroundHandle(degrees, y, radius = .027) {
  const angle = THREE.MathUtils.degToRad(degrees);
  return [FIST_HANDLE[0] + Math.cos(angle) * radius, y, FIST_HANDLE[1] + Math.sin(angle) * radius];
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

function addTaperedSegment(group, start, end, startRadius, endRadius, material) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const direction = to.clone().sub(from);
  const segment = new THREE.Mesh(new THREE.CylinderGeometry(endRadius, startRadius, direction.length(), 10), material);
  segment.position.copy(from).add(to).multiplyScalar(.5);
  segment.quaternion.setFromUnitVectors(vertical, direction.normalize());
  group.add(segment);
}

/** The skin segment starts inside the hand so the forearm meets it without a gap. */
function addForearm(group, wrist, cuffStart, cuffEnd, forearmEnd) {
  addTaperedSegment(group, wrist, cuffStart, .023, .025, skinShade);
  addTaperedSegment(group, cuffStart, cuffEnd, .031, .032, cuff);
  addTaperedSegment(group, cuffEnd, forearmEnd, .032, .047, sleeve);
}

function createCameraSideHand(side) {
  const hand = new THREE.Group();
  // Most of each palm sits behind the camera body; only the outside edge is visible.
  addPalm(hand, [side * .149, -.036, .018], [.029, .049, .026], -side * .13);
  addSleeve(hand, side * .165, -.178, .055, side * .16);

  // Fingers curl around the front corners, leaving the rear screen unobstructed.
  for (const [height, radius, reach] of [[-.069, .006, .003], [-.050, .007, .006], [-.030, .0075, .009], [-.010, .007, .013]]) {
    const base = [side * .159, height, .028];
    const joint = [side * .145, height + .004, -.018];
    const tip = [side * (.126 - reach), height + .011, -.043];
    addFinger(hand, base, joint, radius);
    addFinger(hand, joint, tip, radius * .85);
    addFingertip(hand, tip, radius * .78);
  }
  // Thumbs rest on the rear shoulders, outside the LCD.
  addFinger(hand, [side * .157, .006, .044], [side * .127, .030, .064], .010);
  addFinger(hand, [side * .127, .030, .064], [side * .103, .040, .066], .008);
  addFingertip(hand, [side * .103, .040, .066], .007);
  return hand;
}

/** Two hands brace the camera sides; the right index finger rests on the shutter. */
export function createCameraHands() {
  const hands = new THREE.Group();
  hands.add(createCameraSideHand(-1), createCameraSideHand(1));
  addFinger(hands, [.151, .040, .012], [.113, .076, -.010], .008);
  addFinger(hands, [.113, .076, -.010], [.066, .089, -.014], .007);
  addFingertip(hands, [.066, .089, -.014], .006);
  return hands;
}

/** The forearm of a fist closed around something upright at the origin, shared by the battery and flashlight grips. */
function addFistForearm(hand) {
  addForearm(hand, [.012, -.006, .050], [.011, -.017, .100], [.016, -.024, .123], [.054, -.081, .300]);
}

/**
 * The battery grip's forearm on its own, for the flashlight view to place exactly where the battery's is.
 * The torch's tail passes through it there, so it ignores depth: drawn after the grip and before the torch,
 * it covers the grip and the torch covers it.
 */
export function createFistForearm() {
  const forearm = new THREE.Group();
  // With no palm over it, the wrist ends round.
  const heel = new THREE.Mesh(roundedPalmGeometry, skinShade);
  heel.position.set(.012, -.006, .050);
  heel.scale.setScalar(.023);
  forearm.add(heel);
  addFistForearm(forearm);
  // The parts run from the hand toward the camera, so drawing them in order leaves the nearer ones on top.
  forearm.children.forEach((part, index, parts) => {
    part.material = part.material.clone();
    part.material.depthTest = false;
    part.material.depthWrite = false;
    part.renderOrder = FOREARM_LAYER + index / parts.length;
  });
  return forearm;
}

/**
 * A fist around the upright battery, built in the battery's own frame. The palm presses its right face,
 * the fingers wrap its front and left faces so their nails show on the near face, and the thumb crosses above them.
 */
export function createBatteryHand() {
  const hand = new THREE.Group();
  // Knuckles ride the battery's front corner; the palm angles in behind it so its heel cups the near face.
  addPad(hand, [.032, -.008, -.015], [0, 1, 0], [1, 0, .15], [.015, .037, .015]);
  addPad(hand, [.021, -.008, .029], [-.34, 0, .94], [.94, 0, .34], [.016, .044, .035]);
  addFistForearm(hand);

  // Finger and thumb thickness match the camera hands.
  for (const [height, radius, reach] of [[.017, .007, 0], [.000, .0075, .002], [-.017, .007, .001], [-.033, .006, -.003]]) {
    const joints = [[.028, height, -.019], [-.024, height, -.020], [-.028 + reach, height, .005], [-.013 + reach, height, .019]];
    addCurledFinger(hand, joints, radius);
    addNail(hand, joints, [0, 0, 1], radius);
  }
  // The thumb lies over the top of the palm, then slopes down across the near face to rest beside the index tip.
  addCurledFinger(hand, [[.018, .014, .050], [.013, .029, .040], [.002, .019, .027], [-.007, .012, .023]], .0095);
  return hand;
}

/**
 * The battery fist turned to hold the torch: the same forearm, built upright with the handle running through the fist,
 * then rotated into the torch's frame (handle along z, head toward -z) so the thumb side faces the head.
 * The palm and knuckle ridge are left out so nothing bulges beside the fingers.
 */
export function createFlashlightHand() {
  const hand = new THREE.Group();
  // The fingers turn together about the handle until their knuckles sit underneath it.
  const fingers = new THREE.Group();
  const handleAxis = new THREE.Vector3(FIST_HANDLE[0], 0, FIST_HANDLE[1]);
  fingers.quaternion.setFromAxisAngle(vertical, THREE.MathUtils.degToRad(-90));
  fingers.position.copy(handleAxis).sub(handleAxis.clone().applyQuaternion(fingers.quaternion));
  hand.add(fingers);

  // The fingers leave the same knuckles as the battery grip and wrap the handle.
  for (const [height, radius, wrap] of [[.017, .007, 0], [.000, .0075, 4], [-.017, .007, 0], [-.033, .006, -6]]) {
    const joints = [[.028, height, -.019], aroundHandle(-85, height), aroundHandle(-115 - wrap, height), aroundHandle(-138 - wrap, height)];
    const tip = joints.at(-1);
    addCurledFinger(fingers, joints, radius);
    addNail(fingers, joints, [tip[0] - FIST_HANDLE[0], 0, tip[2] - FIST_HANDLE[1]], radius);
  }
  // The thumb rises from the hand on the right of the handle and lies along its top, parallel to it.
  const thumb = [aroundHandle(115, -.024, .038), aroundHandle(150, -.020, .0303), aroundHandle(165, -.010, .0283)];
  addCurledFinger(hand, thumb, .0088);
  // Once the fist is rolled into place this diagonal points straight up, so the thumbnail faces the eye.
  addNail(hand, thumb, [-1, 0, -1], .0097);

  // The fist's upright axis points at the head, rolled 45° about the handle so the forearm drops away to the lower right.
  hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
    new THREE.Vector3(-1, -1, 0).normalize(), new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, -1, 0).normalize()));
  // The fist closes just behind the head, leaving the tail free behind the little finger.
  hand.position.set(0, 0, -.012).sub(handleAxis.applyQuaternion(hand.quaternion));
  hand.traverse(part => { part.renderOrder = GRIP_LAYER; });
  return hand;
}
