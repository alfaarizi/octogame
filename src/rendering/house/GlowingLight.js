/**
 * A light paired with the material that appears to give it off (a pumpkin's face, embers, the front door),
 * so the two always brighten and dim together.
 */
export class GlowingLight {
  #light;
  #material;
  #intensity;
  #glow;

  /**
   * @param {import('three').Light} light - The light itself.
   * @param {import('three').MeshStandardMaterial} material - The material that appears to give the light off.
   * @param {object} levels - Brightness at strength 1.
   * @param {number} levels.intensity - The light's intensity.
   * @param {number} levels.glow - The material's emissive intensity.
   */
  constructor(light, material, { intensity, glow }) {
    this.#light = light;
    this.#material = material;
    this.#intensity = intensity;
    this.#glow = glow;
    this.setStrength(1);
  }

  /** @param {number} strength - 0 is dark, 1 is normal, and above 1 flares. */
  setStrength(strength) {
    this.#light.intensity = this.#intensity * strength;
    this.#material.emissiveIntensity = this.#glow * strength;
  }
}
