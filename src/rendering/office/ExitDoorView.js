import * as THREE from 'three';
import { createMergedBoxMesh } from '../meshes.js';
import { GlowingLight } from './GlowingLight.js';

/** @typedef {import('../../types.js').Box} Box */

const GATE = Object.freeze({ thickness: 0.06, postWidth: 0.2, postExtraHeight: 0.2, railHeight: 0.08, barWidth: 0.035, barSpacing: 0.15 });
/** The lamp hangs above the gate, a little inside the grounds. */
const GATE_LIGHT = Object.freeze({ color: 0xff8a30, range: 7, extraHeight: 0.6, distanceInside: 0.8 });
const OPEN_GATE_GLOW = 0.5;
const PULSE = Object.freeze({ rate: 5, base: 0.75, swing: 0.25 });

/** The main gate: dark iron bars between two posts, pulsing orange once the exit is unlocked. */
export class ExitDoorView {
  #exitDoor;
  #glow;

  /**
   * @param {THREE.Scene} scene
   * @param {import('../../world/ExitDoor.js').ExitDoor} exitDoor
   * @param {object} placement - Where the gate stands.
   * @param {number} placement.centerX
   * @param {number} placement.wallZ - The gate's inner face.
   * @param {number} placement.width
   * @param {number} placement.height
   * @param {number} lightIntensity
   */
  constructor(scene, exitDoor, { centerX, wallZ, width, height }, lightIntensity) {
    this.#exitDoor = exitDoor;
    const iron = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.6, metalness: 0.6, emissive: 0xff6a10 });
    const gate = createMergedBoxMesh(gateParts(centerX - width / 2, centerX + width / 2, wallZ, height), iron);
    gate.castShadow = true;
    const lampPosition = { x: centerX, y: height + GATE_LIGHT.extraHeight, z: wallZ - GATE_LIGHT.distanceInside };
    this.#glow = new GlowingLight({ ...GATE_LIGHT, intensity: lightIntensity, position: lampPosition }, iron, OPEN_GATE_GLOW);
    scene.add(gate, this.#glow.light);
    this.update(0);
  }

  update(time) {
    this.#glow.setStrength(this.#exitDoor.isUnlocked ? PULSE.base + PULSE.swing * Math.sin(time * PULSE.rate) : 0);
  }
}

/**
 * Posts at both ends, a rail along the top and bottom, and evenly spaced bars between them.
 * @returns {Box[]}
 */
function gateParts(left, right, wallZ, height) {
  const { thickness, postWidth, postExtraHeight, railHeight, barWidth, barSpacing } = GATE;
  const z0 = wallZ + thickness, z1 = z0 + thickness;
  const span = (x0, x1, y0, y1) => ({ x0, x1, y0, y1, z0, z1 });
  const post = (x) => ({ x0: x - postWidth / 2, x1: x + postWidth / 2, y0: 0, y1: height + postExtraHeight, z0: wallZ, z1: z1 + thickness });
  const barCount = Math.floor((right - left) / barSpacing), barGap = (right - left) / barCount;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const x = left + (i + 0.5) * barGap;
    return span(x - barWidth / 2, x + barWidth / 2, railHeight, height - railHeight);
  });
  return [post(left), post(right), span(left, right, 0.05, 0.05 + railHeight), span(left, right, height - railHeight, height), ...bars];
}
