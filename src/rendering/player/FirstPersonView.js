import * as THREE from 'three';
import { randomSpread } from '../../utils.js';
import { createTorchModel } from './torchModel.js';

const TORCH_POSITION = Object.freeze({ x: 0.22, y: -0.24, z: -0.5 });
const TORCH_BOB_SHARE = 0.4;
// The beam starts at the torch and meets the middle of the screen a few meters out.
const BEAM_ORIGIN = Object.freeze({ x: 0.24, y: -0.2, z: -0.56 });
const BEAM_AIM = Object.freeze({ x: 0, y: -0.1, z: -5 });
const BEAM_COLOR = 0xfff0d0;
const BEAM_PENUMBRA = 0.5;
const HEAD_BOB = Object.freeze({ walkRate: 8.5, sprintRate: 12, walkHeight: 0.035, sprintHeight: 0.06, settleRate: 8 });

/** The player's eyes and hands: camera placement, head bob, the torch model and its spotlight. */
export class FirstPersonView {
  #camera;
  #eyeHeight;
  #maxIntensity;
  #torch;
  #spotlight;
  #bobPhase = 0;
  #bobOffset = 0;
  #eye = { x: 0, y: 0, z: 0 };
  #viewDirection = new THREE.Vector3();

  constructor(camera, { eyeHeight, flashlight, shadowMapSize }) {
    this.#camera = camera;
    this.#eyeHeight = eyeHeight;
    this.#maxIntensity = flashlight.intensity;

    this.#torch = createTorchModel();
    this.#torch.position.set(TORCH_POSITION.x, TORCH_POSITION.y, TORCH_POSITION.z);

    this.#spotlight = new THREE.SpotLight(BEAM_COLOR, flashlight.intensity, flashlight.range, flashlight.coneAngle, BEAM_PENUMBRA, 2);
    this.#spotlight.position.set(BEAM_ORIGIN.x, BEAM_ORIGIN.y, BEAM_ORIGIN.z);
    this.#spotlight.target.position.set(BEAM_AIM.x, BEAM_AIM.y, BEAM_AIM.z);
    this.#spotlight.castShadow = true;
    this.#spotlight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    this.#spotlight.shadow.camera.near = 0.1;
    this.#spotlight.shadow.bias = -0.0004;
    this.#spotlight.shadow.normalBias = 0.02;

    camera.add(this.#torch, this.#spotlight, this.#spotlight.target);
  }

  get camera() {
    return this.#camera;
  }

  /** Camera position as { x, y, z }. */
  get eye() {
    const { x, y, z } = this.#camera.position;
    Object.assign(this.#eye, { x, y, z });
    return this.#eye;
  }

  /** Unit vector the camera looks along, as { x, y, z }. */
  get viewDirection() {
    return this.#camera.getWorldDirection(this.#viewDirection);
  }

  /**
   * @param pose      { position: { x, z }, yaw, pitch }
   * @param movement  { moving, sprinting } for the head bob
   */
  update(seconds, { position, yaw, pitch }, { moving, sprinting }) {
    if (moving) {
      this.#bobPhase += seconds * (sprinting ? HEAD_BOB.sprintRate : HEAD_BOB.walkRate);
      this.#bobOffset = Math.sin(this.#bobPhase) * (sprinting ? HEAD_BOB.sprintHeight : HEAD_BOB.walkHeight);
    } else {
      this.#bobOffset *= Math.max(0, 1 - seconds * HEAD_BOB.settleRate);
    }
    this.#camera.position.set(position.x, this.#eyeHeight + this.#bobOffset, position.z);
    this.#camera.rotation.set(pitch, yaw, 0, 'YXZ');
    this.#torch.position.y = TORCH_POSITION.y + this.#bobOffset * TORCH_BOB_SHARE;
  }

  /** @param fraction 0–1 of the flashlight's full intensity */
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
