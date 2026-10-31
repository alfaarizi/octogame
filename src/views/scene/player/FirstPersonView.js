import * as THREE from 'three';
import { easeToward, randomSpread } from '../../../utils.js';
import { createEquipmentModel, createRightHand } from './equipmentModels.js';

/** @typedef {import('../../../types.js').Cone} Cone */
/** @typedef {import('../../../types.js').Movement} Movement */
/** @typedef {import('../../../types.js').Pose} Pose */
/** @typedef {import('../../../types.js').Ray} Ray */

const TORCH_POSITION = Object.freeze({ x: 0.22, y: -0.24, z: -0.5 });
const TORCH_BOB_SHARE = 0.4;
// The beam starts at the torch and meets the middle of the screen a few meters out.
const BEAM_ORIGIN = Object.freeze({ x: 0.24, y: -0.2, z: -0.56 });
const BEAM_AIM = Object.freeze({ x: 0, y: -0.1, z: -5 });
const BEAM_COLOR = 0xfff0d0;
const BEAM_PENUMBRA = 0.5;
const BEAM_DECAY = 2;
const HEAD_BOB = Object.freeze({ walkRate: 8.5, sprintRate: 12, walkHeight: 0.035, sprintHeight: 0.06, settleRate: 8 });

/** The player's eyes and hands: camera placement, head bob, the torch model and its spotlight. */
export class FirstPersonView {
  #camera;
  #eyeHeight;
  #maxIntensity;
  #torch;
  #held = new THREE.Group();
  #tools = new Map();
  #spotlight;
  #bobPhase = 0;
  #bobOffset = 0;
  #viewDirection = new THREE.Vector3();
  /** @type {Ray} */
  #sight;

  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {object} setup
   * @param {number} setup.eyeHeight
   * @param {{ intensity: number, beamCone: Cone }} setup.flashlight
   * @param {number} setup.shadowMapSize
   */
  constructor(camera, { eyeHeight, flashlight, shadowMapSize }) {
    this.#camera = camera;
    this.#eyeHeight = eyeHeight;
    this.#maxIntensity = flashlight.intensity;
    this.#sight = { origin: camera.position, direction: this.#viewDirection };

    for (const kind of ['flashlight', 'camera', 'battery']) {
      const tool = createEquipmentModel(kind);
      this.#tools.set(kind, tool);
      this.#held.add(tool);
    }
    this.#torch = this.#tools.get('flashlight');
    this.#held.add(createRightHand());
    this.#held.position.copy(TORCH_POSITION);
    this.setHeldItem(null);

    const { range, halfAngle } = flashlight.beamCone;
    this.#spotlight = new THREE.SpotLight(BEAM_COLOR, flashlight.intensity, range, halfAngle, BEAM_PENUMBRA, BEAM_DECAY);
    this.#spotlight.position.copy(BEAM_ORIGIN);
    this.#spotlight.target.position.copy(BEAM_AIM);
    this.#spotlight.castShadow = true;
    this.#spotlight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    this.#spotlight.shadow.camera.near = 0.1;
    this.#spotlight.shadow.bias = -0.0004;
    this.#spotlight.shadow.normalBias = 0.02;

    camera.add(this.#held, this.#spotlight, this.#spotlight.target);
  }

  get camera() {
    return this.#camera;
  }

  /** @returns {Ray} Where the camera is and the unit vector it looks along. Read it again after the camera moves. */
  get sight() {
    this.#camera.getWorldDirection(this.#viewDirection);
    return this.#sight;
  }

  /**
   * @param {number} seconds - Time since the last frame.
   * @param {Pose} pose - Where the player stands and looks.
   * @param {Movement} movement - Drives the head bob.
   */
  update(seconds, { position, yaw, pitch }, { moving, sprinting }) {
    if (moving) {
      this.#bobPhase += seconds * (sprinting ? HEAD_BOB.sprintRate : HEAD_BOB.walkRate);
      this.#bobOffset = Math.sin(this.#bobPhase) * (sprinting ? HEAD_BOB.sprintHeight : HEAD_BOB.walkHeight);
    } else {
      this.#bobOffset = easeToward(this.#bobOffset, 0, seconds * HEAD_BOB.settleRate);
    }
    this.#camera.position.set(position.x, position.y + this.#eyeHeight + this.#bobOffset, position.z);
    this.#camera.rotation.set(pitch, yaw, 0, 'YXZ');
    this.#held.position.y = TORCH_POSITION.y + this.#bobOffset * TORCH_BOB_SHARE;
  }

  setHeldItem(kind) {
    this.#held.visible = Boolean(kind);
    for (const [name, tool] of this.#tools) tool.visible = name === kind;
  }

  /** Photo capture excludes the equipment in the foreground. */
  withoutHeldItem(capture) {
    const visible = this.#held.visible;
    this.#held.visible = false;
    try { return capture(); } finally { this.#held.visible = visible; }
  }

  /** @param {number} fraction - Share of the flashlight's full intensity, from 0 to 1. */
  setBeamBrightness(fraction) {
    this.#spotlight.intensity = this.#maxIntensity * fraction;
  }

  /** Jolts the camera for this frame; the next update() puts it back. */
  shake(amount) {
    this.#camera.position.x += randomSpread(amount);
    this.#camera.position.y += randomSpread(amount);
    this.#camera.rotation.z = randomSpread(amount) * 2;
  }
}
