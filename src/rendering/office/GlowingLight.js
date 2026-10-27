import * as THREE from 'three';

/** @typedef {import('../../types.js').Point3} Point3 */

const LIGHT_DECAY = 2;

/**
 * A point light paired with the material that appears to give it off (a pumpkin's face, embers, the front door),
 * so the two always brighten and dim together.
 */
export class GlowingLight {
  #light;
  #material;
  #intensity;
  #glow;

  /**
   * @param {object} light
   * @param {number} light.color
   * @param {number} light.intensity - The light's intensity at strength 1.
   * @param {number} light.range
   * @param {Point3} light.position
   * @param {THREE.MeshStandardMaterial} material - The material that appears to give the light off.
   * @param {number} glow - The material's emissive intensity at strength 1.
   */
  constructor({ color, intensity, range, position }, material, glow) {
    this.#light = new THREE.PointLight(color, intensity, range, LIGHT_DECAY);
    this.#light.position.copy(position);
    this.#material = material;
    this.#intensity = intensity;
    this.#glow = glow;
    this.setStrength(1);
  }

  /** The light itself, to add to the scene. */
  get light() {
    return this.#light;
  }

  /** @param {number} strength - 0 is dark, 1 is normal, and above 1 flares. */
  setStrength(strength) {
    this.#light.intensity = this.#intensity * strength;
    this.#material.emissiveIntensity = this.#glow * strength;
  }
}
