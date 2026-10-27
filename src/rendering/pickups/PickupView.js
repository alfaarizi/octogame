import { PickupKind } from '../../gameplay/pickups/PickupField.js';
import { isWithinCone } from '../../utils.js';
import { createBatteryModel, createCandyModel, RESTING_GLOW } from './pickupModels.js';

const SPIN_RATE = 1.5;
const BOB = Object.freeze({ rate: 2, amplitude: 0.03 });
const LIT_GLOW = 1.2;
const GLOW_RESPONSE = 10;
const GLINT_CONE_FRACTION = 0.85;

/** Keeps a spinning, bobbing mesh for each pickup in the field; they glint when the beam is on them. */
export class PickupView {
  #scene;
  #field;
  #glintHalfAngle;
  #glintRange;
  /** Maps each pickup id to its { object, glowMaterial, item, phase }. */
  #meshes = new Map();

  constructor(scene, field, { coneAngle, range }) {
    this.#scene = scene;
    this.#field = field;
    this.#glintHalfAngle = coneAngle * GLINT_CONE_FRACTION;
    this.#glintRange = range;
  }

  /** Adds meshes for new pickups and removes meshes for ones that are gone. */
  sync() {
    const liveIds = new Set(this.#field.items.map((item) => item.id));
    for (const [id, mesh] of this.#meshes) {
      if (liveIds.has(id)) continue;
      this.#scene.remove(mesh.object);
      this.#meshes.delete(id);
    }
    for (const item of this.#field.items) {
      if (!this.#meshes.has(item.id)) this.#meshes.set(item.id, this.#createMesh(item));
    }
  }

  /**
   * @param {number} seconds - Time since the last frame.
   * @param {number} time - Round time, in seconds, which drives the bobbing.
   * @param {{ eye: object, direction: object, isOn: boolean }} beam - The flashlight; `eye` and `direction` are
   *   { x, y, z }.
   */
  update(seconds, time, beam) {
    this.sync();
    for (const { object, glowMaterial, item, phase } of this.#meshes.values()) {
      object.rotation.y += seconds * SPIN_RATE;
      object.position.y = item.position.y + Math.sin(time * BOB.rate + phase) * BOB.amplitude;
      const isLit = beam.isOn && isWithinCone(beam.eye, beam.direction, item.position, this.#glintHalfAngle, this.#glintRange);
      const targetGlow = isLit ? LIT_GLOW : RESTING_GLOW;
      glowMaterial.emissiveIntensity += (targetGlow - glowMaterial.emissiveIntensity) * Math.min(1, seconds * GLOW_RESPONSE);
    }
  }

  #createMesh(item) {
    const { object, glowMaterial } = item.kind === PickupKind.CANDY ? createCandyModel() : createBatteryModel();
    object.position.set(item.position.x, item.position.y, item.position.z);
    this.#scene.add(object);
    return { object, glowMaterial, item, phase: Math.random() * Math.PI * 2 };
  }
}
