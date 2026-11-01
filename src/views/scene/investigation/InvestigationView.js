import * as THREE from 'three';
import { createBoxMesh, createBoxMeshFromBounds } from '../meshes.js';
import { createLabel } from '../textLabels.js';

const surface = (color) => new THREE.MeshStandardMaterial({ color, roughness: .9, side: THREE.DoubleSide });
const solidSurface = (color) => new THREE.MeshStandardMaterial({ color, roughness: .8, transparent: false, depthWrite: true });
const Facing = Object.freeze({
  south: { yaw: 0, x: 0, z: 1 }, north: { yaw: Math.PI, x: 0, z: -1 },
  east: { yaw: Math.PI / 2, x: 1, z: 0 }, west: { yaw: -Math.PI / 2, x: -1, z: 0 },
});

/** Authored anomalies and office interaction props; model state drives drawer and evidence status. */
export class InvestigationView {
  #office;
  #photography;
  #drawers = new Map();
  #switches = new Map();
  #subjects = new Map();

  constructor(scene, office, photography) {
    this.#office = office;
    this.#photography = photography;
    for (const item of office.objects) {
      if (item.kind === 'note') {
        scene.add(createNote(item));
      } else if (item.kind === 'closet') scene.add(createCloset(item));
      else if (item.kind === 'switch') {
        const { group, rocker } = createLightSwitch(item);
        scene.add(group);
        this.#switches.set(item.id, rocker);
      } else {
        const { cabinet, drawer, direction } = createSupplyDrawer(item);
        scene.add(cabinet, drawer);
        this.#drawers.set(item.id, { mesh: drawer, closedX: drawer.position.x, closedZ: drawer.position.z, direction });
      }
    }
    for (const subject of photography.subjects) {
      const object = createAnomaly(subject);
      scene.add(object);
      this.#subjects.set(subject.id, object);
    }
  }

  update() {
    for (const [id, { mesh, closedX, closedZ, direction }] of this.#drawers) {
      const extension = this.#office.isOpened(id) ? .2 : 0;
      mesh.position.x = closedX + direction.x * extension;
      mesh.position.z = closedZ + direction.z * extension;
    }
    for (const [id, rocker] of this.#switches) rocker.rotation.x = this.#office.isSwitchOn(id) ? -.25 : .25;
    for (const [id, object] of this.#subjects) {
      const recorded = this.#photography.isDocumented(id);
      for (const material of object.userData.evidenceMaterials) {
        material.emissiveIntensity = recorded ? .07 : .28;
      }
    }
  }
}

/** A closed cabinet body with an opaque, shallow tray that pulls forward. */
function createSupplyDrawer({ box, facing }) {
  const cabinet = createBoxMeshFromBounds(box, solidSurface(0x4e5855));
  const drawer = new THREE.Group();
  const shell = solidSurface(0x747a6d);
  const inner = solidSurface(0x353d3a);
  const { x0, x1, y1, z0, z1 } = box;
  const acrossX = facing === 'north' || facing === 'south';
  const width = acrossX ? x1 - x0 : z1 - z0;
  const depth = acrossX ? z1 - z0 : x1 - x0;
  const left = -width / 2 + .035, right = width / 2 - .035;
  const bottom = y1 - .31, top = y1 - .08;
  const front = depth / 2, back = front - Math.min(.2, depth - .07);
  drawer.add(
    createBoxMeshFromBounds({ x0: left, x1: right, y0: bottom, y1: top, z0: front + .015, z1: front + .055 }, shell),
    createBoxMeshFromBounds({ x0: left, x1: right, y0: bottom, y1: bottom + .025, z0: back, z1: front + .055 }, inner),
    createBoxMeshFromBounds({ x0: left, x1: left + .025, y0: bottom, y1: top, z0: back, z1: front + .015 }, inner),
    createBoxMeshFromBounds({ x0: right - .025, x1: right, y0: bottom, y1: top, z0: back, z1: front + .015 }, inner),
  );
  drawer.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
  drawer.rotation.y = Facing[facing].yaw;
  return { cabinet, drawer, direction: Facing[facing] };
}

function createLightSwitch({ position, facing }) {
  const group = new THREE.Group();
  const plate = createBoxMesh({ width: .14, height: .2, depth: .03 }, { x: 0, y: 0, z: 0 }, solidSurface(0xa6a99d));
  const rocker = createBoxMesh({ width: .045, height: .09, depth: .045 }, { x: 0, y: 0, z: .035 }, solidSurface(0x303a37));
  group.add(plate, rocker);
  group.position.copy(position);
  group.rotation.y = Facing[facing].yaw;
  return { group, rocker };
}

function createNote({ name, position, orientation }) {
  const group = new THREE.Group();
  const note = new THREE.Mesh(new THREE.PlaneGeometry(.28, .2), surface(0xc9c4a9));
  const ink = createLabel(name.toUpperCase(), .26, .18, '#d2cfb5', '#303b39');
  ink.position.z = .002;
  group.add(note, ink);
  group.position.copy(position);
  if (orientation === 'flat') group.rotation.x = -Math.PI / 2;
  return group;
}

function createCloset({ box, name, facing = 'south' }) {
  const group = new THREE.Group();
  const metal = surface(0x354441);
  const { x0, x1, y0, y1, z0, z1 } = box;
  for (const [side, bounds] of [
    ['west', { x0, x1: x0 + .06, y0, y1, z0, z1 }],
    ['east', { x0: x1 - .06, x1, y0, y1, z0, z1 }],
    ['north', { x0, x1, y0, y1, z0, z1: z0 + .06 }],
    ['south', { x0, x1, y0, y1, z0: z1 - .06, z1 }],
  ]) if (side !== facing) group.add(createBoxMeshFromBounds(bounds, metal));
  for (const bounds of [
    { x0, x1, y0: y1 - .06, y1, z0, z1 },
    { x0, x1, y0, y1: y0 + .06, z0, z1 },
  ]) group.add(createBoxMeshFromBounds(bounds, metal));
  // Two inset doors leave a narrow center seam. The slots also serve as the hidden camera's view.
  const doorGap = .012;
  const westFacing = facing === 'west';
  const doorMiddle = westFacing ? (z0 + z1) / 2 : (x0 + x1) / 2;
  const firstEdge = westFacing ? z0 : x0;
  const lastEdge = westFacing ? z1 : x1;
  for (const [doorLeft, doorRight] of [[firstEdge + .035, doorMiddle - doorGap], [doorMiddle + doorGap, lastEdge - .035]]) {
    for (const [bottom, top] of [[.07, 1.46], [1.49, 1.56], [1.64, 1.71], [1.74, y1 - y0 - .05]]) {
      const face = westFacing
        ? { x0, x1: x0 + .035, z0: doorLeft, z1: doorRight }
        : { x0: doorLeft, x1: doorRight, z0: z1 - .035, z1 };
      group.add(createBoxMeshFromBounds({ ...face, y0: y0 + bottom, y1: y0 + top }, metal));
    }
  }
  for (const offset of [-.07, .07]) {
    const position = westFacing
      ? { x: x0 - .02, y: y0 + 1.05, z: doorMiddle + offset }
      : { x: doorMiddle + offset, y: y0 + 1.05, z: z1 + .02 };
    group.add(createBoxMesh({ width: westFacing ? .045 : .025, height: .18, depth: westFacing ? .025 : .045 }, position, surface(0xa7a594)));
  }
  const label = createLabel('STAFF LOCKER', .38, .1, '#b8c2ab', '#293b36');
  label.position.set(westFacing ? x0 - .006 : doorMiddle, y0 + 2.05, westFacing ? doorMiddle : z1 + .006);
  if (westFacing) label.rotation.y = -Math.PI / 2;
  group.add(label);
  group.name = name;
  group.traverse((mesh) => { if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
  return group;
}

/** Scene props are attached to their authored supports. Their center is the camera target. */
function createAnomaly(subject) {
  const group = new THREE.Group();
  const evidenceMaterials = [];
  const marked = (material) => { evidenceMaterials.push(material); return material; };
  const image = () => {
    const texture = new THREE.CanvasTexture(drawAnomaly(subject.kind));
    texture.colorSpace = THREE.SRGBColorSpace;
    return marked(new THREE.MeshStandardMaterial({
      map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false,
      emissiveMap: texture, emissive: 0x88baae, emissiveIntensity: .3,
      polygonOffset: true, polygonOffsetFactor: -2,
    }));
  };
  if (subject.kind === 'handprint' || subject.kind === 'drawing') {
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(subject.kind === 'handprint' ? .32 : .48, subject.kind === 'handprint' ? .4 : .58), image());
    decal.rotation.x = -Math.PI / 2;
    if (subject.kind === 'handprint') decal.rotation.z = Math.PI;
    group.add(decal);
  } else if (subject.kind === 'phone') {
    group.add(...createPhone(marked));
  } else if (subject.kind === 'clock') {
    group.add(...createClock(image()));
  } else {
    group.add(...createSkull(marked));
  }
  group.userData.evidenceMaterials = evidenceMaterials;
  group.position.set(subject.x, subject.y, subject.z);
  return group;
}

function createPhone(marked) {
  const body = marked(new THREE.MeshStandardMaterial({ color: 0x2c3438, emissive: 0x365e5b, emissiveIntensity: .3, roughness: .55 }));
  const buttons = new THREE.MeshStandardMaterial({ color: 0xb8b8a8, roughness: .7 });
  const parts = [createBoxMesh({ width: .27, height: .1, depth: .2 }, { x: 0, y: -.08, z: 0 }, body)];
  for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) {
    parts.push(createBoxMesh({ width: .025, height: .006, depth: .018 },
      { x: (column - 1) * .052, y: -.025, z: -.015 + row * .044 }, buttons));
  }
  const receiver = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .24, 10), body);
  receiver.rotation.z = Math.PI / 2;
  receiver.position.y = .025;
  parts.push(receiver);
  for (const x of [-.12, .12]) {
    const cup = new THREE.Mesh(new THREE.SphereGeometry(.038, 8, 6), body);
    cup.position.set(x, .025, 0);
    parts.push(cup);
  }
  return parts;
}

function createClock(faceMaterial) {
  const casing = new THREE.MeshStandardMaterial({ color: 0x49433a, metalness: .5, roughness: .55 });
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .055, 24), casing);
  dial.rotation.x = Math.PI / 2;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(.38, .475), faceMaterial);
  face.rotation.y = Math.PI;
  face.position.z = -.03;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.025, .035, .12, 8), casing);
  stem.position.y = -.18;
  const foot = createBoxMesh({ width: .23, height: .025, depth: .16 }, { x: 0, y: -.217, z: 0 }, casing);
  return [dial, face, stem, foot];
}

/** A human skull resting on its jaw, centered 0.1 above the ground and grinning north (-z). */
function createSkull(marked) {
  const bone = marked(new THREE.MeshStandardMaterial({ color: 0xd8cfb4, emissive: 0x6f8f86, emissiveIntensity: .25, roughness: .85 }));
  const hollow = new THREE.MeshStandardMaterial({ color: 0x060a09, roughness: 1 });
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(.1, 16, 12), bone);
  cranium.scale.set(.82, .85, 1);
  cranium.position.set(0, .02, .015);
  const parts = [
    cranium,
    createBoxMesh({ width: .12, height: .065, depth: .07 }, { x: 0, y: -.035, z: -.058 }, bone),
    createBoxMesh({ width: .105, height: .028, depth: .085 }, { x: 0, y: -.088, z: -.05 }, bone),
  ];
  for (const side of [-1, 1]) {
    const cheekbone = new THREE.Mesh(new THREE.SphereGeometry(.026, 10, 8), bone);
    cheekbone.position.set(side * .05, -.022, -.07);
    const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(.031, 12, 10), hollow);
    eyeSocket.scale.z = .6;
    eyeSocket.position.set(side * .036, .01, -.087);
    parts.push(cheekbone, eyeSocket);
  }
  const noseHole = new THREE.Mesh(new THREE.SphereGeometry(.017, 10, 8), hollow);
  noseHole.scale.set(.65, 1, .45);
  noseHole.position.set(0, -.03, -.093);
  parts.push(noseHole);
  for (let tooth = 0; tooth < 6; tooth++) {
    parts.push(createBoxMesh({ width: .012, height: .018, depth: .01 }, { x: (tooth - 2.5) * .0145, y: -.069, z: -.094 }, bone));
  }
  const skull = new THREE.Group();
  skull.add(...parts);
  // Rolled back onto the cranium, so the face tips up toward whoever is standing over it.
  skull.rotation.set(.3, .35, .1);
  return [skull];
}

/** Canvas marks only paint the subject; the meshes define its physical size and support. */
function drawAnomaly(kind) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 320;
  const c = canvas.getContext('2d');
  c.fillStyle = '#c7d5c6';
  c.strokeStyle = '#abcec2'; c.lineWidth = 6;
  if (kind === 'handprint') {
    drawSixFingerHandprint(c);
  } else if (kind === 'clock') {
    c.beginPath(); c.arc(128, 155, 101, 0, Math.PI * 2); c.stroke();
    c.font = 'bold 40px monospace'; c.fillText('13', 105, 101);
    c.beginPath(); c.moveTo(128, 155); c.lineTo(128, 116); c.moveTo(128, 155); c.lineTo(185, 192); c.stroke();
    for (let i = 1; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.fillRect(125 + Math.sin(a) * 84, 152 - Math.cos(a) * 84, 6, 6); }
  } else if (kind === 'drawing') {
    c.fillStyle = '#c5c0a9'; c.fillRect(25, 24, 206, 275); c.strokeStyle = '#33413d';
    c.beginPath(); c.arc(128, 109, 33, 0, Math.PI * 2); c.moveTo(128, 142); c.lineTo(128, 223); c.moveTo(72, 173); c.lineTo(184, 173); c.moveTo(128, 223); c.lineTo(91, 268); c.moveTo(128, 223); c.lineTo(163, 268); c.stroke();
    c.fillStyle = '#33413d'; c.font = 'bold 19px monospace'; c.fillText('WHO IS THIS?', 53, 53);
    c.fillRect(94, 94, 69, 28);
  }
  return canvas;
}

/** A smeared palm, thumb and five distinct fingers: the extra digit is the clue. */
function drawSixFingerHandprint(context) {
  context.fillStyle = 'rgba(106, 24, 24, .78)';
  context.beginPath();
  context.moveTo(67, 154);
  context.bezierCurveTo(91, 141, 164, 145, 190, 161);
  context.bezierCurveTo(211, 189, 192, 235, 164, 248);
  context.lineTo(155, 295); context.lineTo(96, 289); context.lineTo(91, 251);
  context.bezierCurveTo(59, 226, 52, 181, 67, 154);
  context.fill();
  const fingertipY = [89, 67, 50, 62, 85];
  for (let index = 0; index < fingertipY.length; index++) {
    const center = 77 + index * 28;
    const width = index === 2 ? 21 : 19;
    const tip = fingertipY[index];
    context.beginPath();
    context.moveTo(center - width / 2, 167);
    context.lineTo(center - width / 2, tip + 10);
    context.quadraticCurveTo(center - width / 2, tip, center, tip);
    context.quadraticCurveTo(center + width / 2, tip, center + width / 2, tip + 10);
    context.lineTo(center + width / 2, 167);
    context.fill();
  }
  context.beginPath();
  context.moveTo(72, 181);
  context.bezierCurveTo(51, 177, 37, 164, 27, 146);
  context.bezierCurveTo(16, 129, 28, 116, 40, 125);
  context.bezierCurveTo(56, 138, 68, 145, 83, 155);
  context.fill();
  let seed = 79;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  context.fillStyle = 'rgba(58, 12, 12, .24)';
  for (let mark = 0; mark < 190; mark++) {
    const x = 35 + random() * 178, y = 65 + random() * 227;
    context.fillRect(x, y, 1 + random() * 5, 1 + random() * 3);
  }
  context.globalCompositeOperation = 'destination-out';
  for (let gap = 0; gap < 18; gap++) {
    const x = 62 + random() * 130, y = 95 + random() * 145;
    context.fillRect(x, y, 1 + random() * 4, 2 + random() * 7);
  }
  context.globalCompositeOperation = 'source-over';
}
