import * as THREE from 'three';
import { createBoxMesh } from '../meshes.js';
import { GlowingLight } from './GlowingLight.js';

const DOOR_THICKNESS = 0.12;
const PANEL = Object.freeze({ width: 0.7, tallHeight: 1.0, shortHeight: 0.8, depth: 0.03, upperCenter: 1.65, lowerCenter: 0.6 });
const KNOB = Object.freeze({ radius: 0.04, height: 1.05, offsetFromCenter: 0.4 });
/** The light hangs inside the house, in front of the door. */
const DOOR_LIGHT = Object.freeze({ color: 0xff8a30, range: 7, height: 2.1, distanceInside: 0.8 });
const OPEN_DOOR_GLOW = 0.5;
const PULSE = Object.freeze({ rate: 5, base: 0.75, swing: 0.25 });

/** The front door: dark wood that pulses orange once the exit is unlocked. */
export class ExitDoorView {
  #exitDoor;
  #glow;

  /**
   * @param {THREE.Scene} scene
   * @param {import('../../world/ExitDoor.js').ExitDoor} exitDoor
   * @param {object} placement - Where the door sits in the south wall.
   * @param {number} placement.centerX
   * @param {number} placement.wallZ - The inner face of the wall.
   * @param {number} placement.width
   * @param {number} placement.height
   * @param {object} appearance
   * @param {THREE.Material} appearance.wallMaterial - For the wall above the door.
   * @param {number} appearance.wallHeight
   * @param {number} appearance.lightIntensity
   */
  constructor(scene, exitDoor, { centerX, wallZ, width, height }, { wallMaterial, wallHeight, lightIntensity }) {
    this.#exitDoor = exitDoor;
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x3b2414, roughness: 0.7, emissive: 0xff6a10 });

    const door = createBoxMesh({ width, height, depth: DOOR_THICKNESS }, { x: centerX, y: height / 2, z: wallZ + DOOR_THICKNESS / 2 }, doorMaterial);
    door.castShadow = door.receiveShadow = true;

    const panelX = width / 4;
    const panels = [
      [-panelX, PANEL.upperCenter, PANEL.tallHeight], [panelX, PANEL.upperCenter, PANEL.tallHeight],
      [-panelX, PANEL.lowerCenter, PANEL.shortHeight], [panelX, PANEL.lowerCenter, PANEL.shortHeight],
    ].map(([dx, centerY, panelHeight]) =>
      createBoxMesh({ width: PANEL.width, height: panelHeight, depth: PANEL.depth }, { x: centerX + dx, y: centerY, z: wallZ - 0.01 }, doorMaterial),
    );

    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(KNOB.radius, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.8, roughness: 0.3 }),
    );
    knob.position.set(centerX + width * KNOB.offsetFromCenter, KNOB.height, wallZ - KNOB.radius);

    const lintelHeight = wallHeight - height;
    const lintel = createBoxMesh(
      { width, height: lintelHeight, depth: 1 },
      { x: centerX, y: height + lintelHeight / 2, z: wallZ + 0.5 },
      wallMaterial,
    );

    this.#glow = new GlowingLight(
      { ...DOOR_LIGHT, intensity: lightIntensity, position: { x: centerX, y: DOOR_LIGHT.height, z: wallZ - DOOR_LIGHT.distanceInside } },
      doorMaterial,
      OPEN_DOOR_GLOW,
    );
    scene.add(door, ...panels, knob, lintel, this.#glow.light);
    this.update(0);
  }

  update(time) {
    this.#glow.setStrength(this.#exitDoor.isUnlocked ? PULSE.base + PULSE.swing * Math.sin(time * PULSE.rate) : 0);
  }
}
