/**
 * A light paired with the material that appears to give it off (a pumpkin's face, embers, the front door),
 * so the two always brighten and dim together.
 */
export class GlowingLight {
  #light;
  #material;
  #intensity;
  #glow;

  /** @param intensity the light's intensity, and @param glow the material's emissive intensity, at strength 1 */
  constructor(light, material, { intensity, glow }) {
    this.#light = light;
    this.#material = material;
    this.#intensity = intensity;
    this.#glow = glow;
    this.setStrength(1);
  }

  /** @param strength 0 is dark, 1 is normal, above 1 flares */
  setStrength(strength) {
    this.#light.intensity = this.#intensity * strength;
    this.#material.emissiveIntensity = this.#glow * strength;
  }
}
