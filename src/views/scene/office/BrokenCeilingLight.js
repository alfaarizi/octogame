import * as THREE from 'three';
import { createLightShaft } from './LightShaft.js';

const LAMP = Object.freeze({ width: .38, depth: .22, thickness: .02, range: 4.5, intensity: 1.0 });
/** The tube's god ray reaches the floor, spreading about a meter wide while it stays subtle. */
const RAY = Object.freeze({ direction: { x: 0, y: -1, z: 0 }, length: 2.55, radiusTop: .16, radius: 1.15, opacity: .5 });

/** An opaque fluorescent diffuser, a weak repeatably stuttering point light and its haze cone. */
export class BrokenCeilingLight {
  #material = new THREE.MeshStandardMaterial({
    color: 0xbcb9a5, emissive: 0xcac8a1, emissiveIntensity: 0, roughness: .95,
    transparent: false, depthWrite: true,
  });
  #light;
  #shaft;
  #diffuser;
  #phase;

  constructor({ id, position }) {
    this.#diffuser = new THREE.Mesh(new THREE.BoxGeometry(LAMP.width, LAMP.thickness, LAMP.depth), this.#material);
    this.#diffuser.position.set(position.x, position.y, position.z);
    this.#diffuser.castShadow = true;
    this.#light = new THREE.PointLight(0xd5d0ad, 0, LAMP.range, 2);
    this.#light.position.set(position.x, position.y - .15, position.z);
    this.#shaft = createLightShaft({ ...RAY, color: 0xd5d0ad, position: { x: position.x, y: position.y - .07, z: position.z } });
    this.#phase = [...id].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) * .17;
  }

  get objects() { return [this.#diffuser, this.#light, this.#shaft.mesh]; }

  update(isOn, elapsed) {
    const pulse = .28 + .13 * Math.sin(elapsed * 7 + this.#phase) ** 2;
    const dropout = Math.sin(elapsed * 1.9 + this.#phase) > .94 ? .08 : 1;
    const strength = isOn ? pulse * dropout : 0;
    this.#light.intensity = LAMP.intensity * strength;
    this.#material.emissiveIntensity = strength * .85;
    this.#shaft.setStrength(strength);
  }
}
