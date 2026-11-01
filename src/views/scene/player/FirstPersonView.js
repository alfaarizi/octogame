import * as THREE from 'three';
import { easeToward, randomSpread } from '../../../utils.js';
import { createEquipmentModel } from './equipmentModels.js';
import { createBatteryHand, createCameraHands, createFistForearm, createFlashlightHand } from './handModels.js';

/** @typedef {import('../../../types.js').Cone} Cone */
/** @typedef {import('../../../types.js').Movement} Movement */
/** @typedef {import('../../../types.js').Pose} Pose */
/** @typedef {import('../../../types.js').Ray} Ray */

// Both fists sit close enough that their hands match the camera hands on screen. The torch fist sits a little
// beyond and to the right of the battery one, so it closes on the end of the forearm the two grips share.
const TORCH_POSITION = Object.freeze({ x: 0.185, y: -0.18, z: -0.415 });
const BATTERY_POSITION = Object.freeze({ x: 0.17, y: -0.185, z: -0.39 });
const CAMERA_POSITION = Object.freeze({ x: .08, y: -.16, z: -.43 });
// Keep the battery upright so the thumb can cross its face and the fingers can support its base.
const BATTERY_REST = Object.freeze({ roll: 0, y: .005, z: .02 });
const TORCH_BOB_SHARE = 0.4;
// The beam starts at the torch and meets the middle of the screen a few meters out.
const BEAM_ORIGIN = Object.freeze({ x: 0.175, y: -0.175, z: -0.51 });
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
  #heldKind = null;
  #equipmentLight;
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
   * @param {THREE.Texture} setup.cameraScreenTexture
   */
  constructor(camera, { eyeHeight, flashlight, shadowMapSize, cameraScreenTexture }) {
    this.#camera = camera;
    this.#eyeHeight = eyeHeight;
    this.#maxIntensity = flashlight.intensity;
    this.#sight = { origin: camera.position, direction: this.#viewDirection };

    for (const kind of ['flashlight', 'camera', 'battery']) {
      const tool = createEquipmentModel(kind, cameraScreenTexture);
      this.#tools.set(kind, tool);
      this.#held.add(tool);
    }
    this.#torch = this.#tools.get('flashlight');
    this.#torch.position.z = .015;
    const battery = this.#tools.get('battery');
    battery.rotation.z = BATTERY_REST.roll;
    battery.position.set(0, BATTERY_REST.y, BATTERY_REST.z);
    // Each hand is shaped around its tool's own geometry, so it rides along with the tool.
    this.#torch.add(createFlashlightHand());
    // The forearm undoes the torch's tilt and sits exactly where the battery forearm does.
    const forearm = createFistForearm();
    forearm.quaternion.copy(this.#torch.quaternion).invert();
    forearm.position.set(BATTERY_POSITION.x - TORCH_POSITION.x, BATTERY_POSITION.y - TORCH_POSITION.y, BATTERY_POSITION.z - TORCH_POSITION.z)
      .add(battery.position).sub(this.#torch.position).applyQuaternion(forearm.quaternion);
    this.#torch.add(forearm);
    this.#tools.get('camera').add(createCameraHands());
    battery.add(createBatteryHand());
    this.#held.traverse(object => object.layers.set(1));
    camera.layers.enable(1);
    this.#equipmentLight = new THREE.PointLight(0xc4d2cd, .35, .8, 2);
    this.#equipmentLight.position.set(0, -.04, -.22);
    this.#equipmentLight.layers.set(1);
    camera.add(this.#equipmentLight);
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

  get isCameraHeld() {
    return this.#held.visible && this.#tools.get('camera').visible;
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
    this.#positionHeldItem();
  }

  setHeldItem(kind) {
    this.#heldKind = kind;
    this.#held.visible = Boolean(kind);
    for (const [name, tool] of this.#tools) tool.visible = name === kind;
    this.#equipmentLight.visible = Boolean(kind);
    this.#positionHeldItem();
  }

  #positionHeldItem() {
    const position = this.#heldKind === 'camera' ? CAMERA_POSITION
      : this.#heldKind === 'battery' ? BATTERY_POSITION : TORCH_POSITION;
    this.#held.position.set(position.x, position.y + this.#bobOffset * TORCH_BOB_SHARE, position.z);
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
