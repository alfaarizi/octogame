import * as THREE from 'three';
import { createBoxMesh } from '../meshes.js';
import { GlowingLight } from './GlowingLight.js';

const DOOR_THICKNESS = 0.12;
const PANEL = Object.freeze({ width: 0.7, tallHeight: 1.0, shortHeight: 0.8, depth: 0.03, upperCenter: 1.65, lowerCenter: 0.6 });
const OPEN_DOOR_GLOW = 0.5;
const PULSE = Object.freeze({ rate: 5, base: 0.75, swing: 0.25 });

/** The front door: dark wood that pulses orange once the exit is unlocked. */
export class ExitDoorView {
  #exitDoor;
  #glow;

  constructor(scene, exitDoor, { centerX, wallZ, width, height }, { wallMaterial, wallHeight, lightIntensity }) {
    this.#exitDoor = exitDoor;
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x3b2414, roughness: 0.7, emissive: 0xff6a10 });

    const door = createBoxMesh([width, height, DOOR_THICKNESS], [centerX, height / 2, wallZ + DOOR_THICKNESS / 2], doorMaterial);
    door.castShadow = door.receiveShadow = true;

    const panelX = width / 4;
    const panels = [
      [-panelX, PANEL.upperCenter, PANEL.tallHeight], [panelX, PANEL.upperCenter, PANEL.tallHeight],
      [-panelX, PANEL.lowerCenter, PANEL.shortHeight], [panelX, PANEL.lowerCenter, PANEL.shortHeight],
    ].map(([dx, centerY, panelHeight]) =>
      createBoxMesh([PANEL.width, panelHeight, PANEL.depth], [centerX + dx, centerY, wallZ - 0.01], doorMaterial),
    );

    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.8, roughness: 0.3 }),
    );
    knob.position.set(centerX + width * 0.4, 1.05, wallZ - 0.04);

    const lintelHeight = wallHeight - height;
    const lintel = createBoxMesh([width, lintelHeight, 1], [centerX, height + lintelHeight / 2, wallZ + 0.5], wallMaterial);

    const light = new THREE.PointLight(0xff8a30, 0, 7, 2);
    light.position.set(centerX, 2.1, wallZ - 0.8);

    scene.add(door, ...panels, knob, lintel, light);
    this.#glow = new GlowingLight(light, doorMaterial, { intensity: lightIntensity, glow: OPEN_DOOR_GLOW });
    this.update(0);
  }

  update(time) {
    this.#glow.setStrength(this.#exitDoor.isUnlocked ? PULSE.base + PULSE.swing * Math.sin(time * PULSE.rate) : 0);
  }
}
