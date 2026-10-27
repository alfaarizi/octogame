import { PickupKind } from '../../gameplay/pickups/PickupField.js';
import { easeToward, isWithinCone } from '../../utils.js';
import { createBatteryModel, createCandyModel, RESTING_GLOW } from './pickupModels.js';

/** @typedef {import('../../gameplay/pickups/PickupField.js').Pickup} Pickup */
/** @typedef {import('../../types.js').Cone} Cone */
/** @typedef {import('../../types.js').Ray} Ray */
/** @typedef {import('./pickupModels.js').PickupModel & { item: Pickup, phase: number }} PickupMesh */

const SPIN_RATE = 1.5;
const BOB = Object.freeze({ rate: 2, amplitude: 0.03 });
const LIT_GLOW = 1.2;
const GLOW_RESPONSE = 10;
/** Pickups glint inside this share of the visible beam, so they only light up when the beam is clearly on them. */
const GLINT_CONE_FRACTION = 0.85;

/** Keeps a spinning, bobbing mesh for each pickup in the field; they glint when the beam is on them. */
export class PickupView {
  #scene;
  #field;
  /** @type {Cone} */
  #glintCone;
  /** @type {Map<number, PickupMesh>} */
  #meshesById = new Map();
  /** The field's items as of the last sync. */
  #syncedItems = null;

  /**
   * @param {import('three').Scene} scene
   * @param {import('../../gameplay/pickups/PickupField.js').PickupField} field
   * @param {Cone} beamCone - The flashlight's visible beam.
   */
  constructor(scene, field, beamCone) {
    this.#scene = scene;
    this.#field = field;
    this.#glintCone = Object.freeze({ halfAngle: beamCone.halfAngle * GLINT_CONE_FRACTION, range: beamCone.range });
  }

  /** Adds meshes for new pickups and removes meshes for ones that are gone. */
  sync() {
    const items = this.#field.items;
    if (items === this.#syncedItems) return;
    this.#syncedItems = items;
    const liveIds = new Set(items.map((item) => item.id));
    for (const [id, mesh] of this.#meshesById) {
      if (liveIds.has(id)) continue;
      this.#scene.remove(mesh.object);
      this.#meshesById.delete(id);
    }
    for (const item of items) {
      if (!this.#meshesById.has(item.id)) this.#meshesById.set(item.id, this.#createMesh(item));
    }
  }

  /**
   * @param {number} seconds - Time since the last frame.
   * @param {number} time - Round time, in seconds, which drives the bobbing.
   * @param {Ray | null} beam - The flashlight beam, or null while it's off.
   */
  update(seconds, time, beam) {
    this.sync();
    for (const { object, glowMaterial, item, phase } of this.#meshesById.values()) {
      object.rotation.y += seconds * SPIN_RATE;
      object.position.y = item.position.y + Math.sin(time * BOB.rate + phase) * BOB.amplitude;
      const isLit = beam !== null && isWithinCone(beam, this.#glintCone, item.position);
      glowMaterial.emissiveIntensity = easeToward(glowMaterial.emissiveIntensity, isLit ? LIT_GLOW : RESTING_GLOW, seconds * GLOW_RESPONSE);
    }
  }

  /** @returns {PickupMesh} */
  #createMesh(item) {
    const model = item.kind === PickupKind.CANDY ? createCandyModel() : createBatteryModel();
    model.object.position.copy(item.position);
    this.#scene.add(model.object);
    return { ...model, item, phase: Math.random() * Math.PI * 2 };
  }
}
