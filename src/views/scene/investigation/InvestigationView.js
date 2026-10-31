import * as THREE from 'three';
import { createBoxMesh, createBoxMeshFromBounds } from '../meshes.js';
import { createLabel } from '../textLabels.js';

const surface = (color) => new THREE.MeshStandardMaterial({ color, roughness: .9, side: THREE.DoubleSide });

/** Authored anomalies and office interaction props; model state drives drawer and evidence status. */
export class InvestigationView {
  #office;
  #photography;
  #drawers = new Map();
  #subjects = new Map();

  constructor(scene, office, photography) {
    this.#office = office;
    this.#photography = photography;
    for (const item of office.objects) {
      if (item.kind === 'note') {
        scene.add(createNote(item));
      } else if (item.kind === 'closet') scene.add(createCloset(item));
      else {
        scene.add(createBoxMeshFromBounds(item.box, surface(0x4e5855)));
        const { box } = item;
        const drawer = createBoxMesh({ width: box.x1 - box.x0 - .06, height: .22, depth: .1 },
          { x: item.position.x, y: box.y1 - .15, z: box.z1 + .025 }, surface(0x747a6d));
        scene.add(drawer);
        this.#drawers.set(item.id, { mesh: drawer, closedZ: drawer.position.z });
      }
    }
    for (const subject of photography.subjects) {
      const object = createAnomaly(subject);
      scene.add(object);
      this.#subjects.set(subject.id, object);
    }
  }

  update(time) {
    for (const [id, { mesh, closedZ }] of this.#drawers) mesh.position.z = closedZ + (this.#office.isOpened(id) ? .2 : 0);
    for (const [id, object] of this.#subjects) {
      const recorded = this.#photography.isDocumented(id);
      for (const material of object.userData.evidenceMaterials) {
        material.emissiveIntensity = recorded ? .07 : .28 + Math.sin(time * 2) * .08;
      }
    }
  }
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

function createCloset({ box, name }) {
  const group = new THREE.Group();
  const metal = surface(0x354441);
  const { x0, x1, y0, y1, z0, z1 } = box;
  for (const bounds of [
    { x0, x1: x0 + .06, y0, y1, z0, z1 }, { x0: x1 - .06, x1, y0, y1, z0, z1 },
    { x0, x1, y0, y1, z0, z1: z0 + .06 }, { x0, x1, y0: y1 - .06, y1, z0, z1 },
    { x0, x1, y0, y1: y0 + .06, z0, z1 },
  ]) group.add(createBoxMeshFromBounds(bounds, metal));
  // Two inset doors leave a narrow center seam. The slots also serve as the hidden camera's view.
  const doorGap = .012;
  const doorMiddle = (x0 + x1) / 2;
  for (const [doorLeft, doorRight] of [[x0 + .035, doorMiddle - doorGap], [doorMiddle + doorGap, x1 - .035]]) {
    for (const [bottom, top] of [[.07, 1.46], [1.49, 1.56], [1.64, 1.71], [1.74, y1 - y0 - .05]]) {
      group.add(createBoxMeshFromBounds({ x0: doorLeft, x1: doorRight, z0: z1 - .035, z1, y0: y0 + bottom, y1: y0 + top }, metal));
    }
  }
  for (const x of [doorMiddle - .07, doorMiddle + .07]) {
    group.add(createBoxMesh({ width: .025, height: .18, depth: .045 }, { x, y: y0 + 1.05, z: z1 + .02 }, surface(0xa7a594)));
  }
  const label = createLabel('STAFF LOCKER', .38, .1, '#b8c2ab', '#293b36');
  label.position.set(doorMiddle, y0 + 2.05, z1 + .006);
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
    group.add(decal);
  } else if (subject.kind === 'phone') {
    group.add(...createPhone(marked));
  } else if (subject.kind === 'clock') {
    group.add(...createClock(image()));
  } else {
    group.add(...createVisitor(marked));
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

function createVisitor(marked) {
  const coat = marked(new THREE.MeshStandardMaterial({ color: 0x273b39, emissive: 0x33625b, emissiveIntensity: .25, roughness: .95 }));
  const face = new THREE.MeshStandardMaterial({ color: 0x060a09, roughness: 1 });
  const parts = [];
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(.24, .37, 1.05, 9), coat);
  torso.position.y = -.21;
  parts.push(torso);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, .5, 8), coat);
    leg.position.set(side * .16, -.78, 0);
    const shoe = createBoxMesh({ width: .2, height: .07, depth: .3 }, { x: side * .16, y: -1.015, z: -.07 }, face);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, .7, 8), coat);
    arm.rotation.z = side * -.2;
    arm.position.set(side * .31, -.2, 0);
    parts.push(leg, shoe, arm);
  }
  const hood = new THREE.Mesh(new THREE.SphereGeometry(.24, 12, 8), coat);
  hood.position.y = .48;
  const voidFace = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), face);
  voidFace.scale.z = .35;
  voidFace.position.set(0, .47, -.205);
  parts.push(hood, voidFace);
  return parts;
}

/** Canvas marks only paint the subject; the meshes define its physical size and support. */
function drawAnomaly(kind) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 320;
  const c = canvas.getContext('2d');
  c.fillStyle = kind === 'handprint' ? '#783232' : '#c7d5c6';
  c.strokeStyle = '#abcec2'; c.lineWidth = 6;
  if (kind === 'handprint') {
    c.beginPath(); c.ellipse(125, 194, 50, 62, -.1, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(57 + i * 27, 119 - Math.sin(i / 5 * Math.PI) * 33, 10, 49, (i - 2.5) * .13, 0, Math.PI * 2); c.fill(); }
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
