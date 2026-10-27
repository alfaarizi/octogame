import * as THREE from 'three';
import { GameEvent } from '../../core/GameEvent.js';
import { chance } from '../../utils.js';
import { createBoxMesh } from '../meshes.js';
import { GlowingLight } from './GlowingLight.js';
import { createLanternModel, LANTERN_FACE_GLOW } from './lanternModel.js';

// From the surface it sits on to the pumpkin's center
const LANTERN_SEAT_OFFSET = 0.13;
const LANTERN_LIGHT = Object.freeze({ color: 0xff8a2a, range: 4.5, forwardOffset: 0.25, heightOffset: 0.25 });
const FIRE_LIGHT = Object.freeze({ color: 0xff5014, range: 5 });
const EMBER_GLOW = 1.2;
const STUTTER = Object.freeze({ dropChance: 0.45, dropped: 0.05, flare: 1.5 });
const StutterDuration = Object.freeze({ EXIT_UNLOCKED: 1.6, AMBIENT_NOISE: 0.4 });

/**
 * The jack-o'-lanterns and the fireplace: warm lights that flicker, and all stutter at once
 * when the exit opens or a spooky noise asks for it.
 */
export class HouseLightingView {
  #scene;
  #flames = [];
  #stutterTime = 0;

  constructor(scene, events, { lanterns, fireplace, lanternIntensity, fireIntensity }) {
    this.#scene = scene;
    for (const lantern of lanterns) this.#addLantern(lantern, lanternIntensity);
    this.#addFireplace(fireplace, fireIntensity);
    events.on(GameEvent.EXIT_UNLOCKED, () => this.stutterAll(StutterDuration.EXIT_UNLOCKED));
    events.on(GameEvent.AMBIENT_NOISE, ({ flickerLanterns }) => flickerLanterns && this.stutterAll(StutterDuration.AMBIENT_NOISE));
  }

  /** Makes every light stutter for a moment. */
  stutterAll(seconds) {
    this.#stutterTime = Math.max(this.#stutterTime, seconds);
  }

  update(seconds, time) {
    this.#stutterTime = Math.max(0, this.#stutterTime - seconds);
    this.#flames.forEach((flame, index) => {
      let strength = 0.85 + 0.15 * Math.sin(time * 8.3 + index * 2.1) * Math.sin(time * 13.1 + index * 5.3);
      if (this.#stutterTime > 0) strength *= chance(STUTTER.dropChance) ? STUTTER.dropped : STUTTER.flare;
      flame.setStrength(strength);
    });
  }

  #addLantern({ x, y, z, facing }, intensity) {
    const { object, glowMaterial } = createLanternModel();
    const yaw = Math.atan2(facing.x - x, facing.z - z);
    object.position.set(x, y + LANTERN_SEAT_OFFSET, z);
    object.rotation.y = yaw;
    const light = new THREE.PointLight(LANTERN_LIGHT.color, intensity, LANTERN_LIGHT.range, 2);
    light.position.set(
      x + Math.sin(yaw) * LANTERN_LIGHT.forwardOffset,
      y + LANTERN_LIGHT.heightOffset,
      z + Math.cos(yaw) * LANTERN_LIGHT.forwardOffset,
    );
    this.#scene.add(object, light);
    this.#flames.push(new GlowingLight(light, glowMaterial, { intensity, glow: LANTERN_FACE_GLOW }));
  }

  #addFireplace({ embers, light: lightPosition }, intensity) {
    const emberMaterial = new THREE.MeshStandardMaterial({ color: 0x1a0a04, emissive: 0xff4010 });
    const emberMesh = createBoxMesh([embers.width, embers.height, embers.depth], [embers.x, embers.y, embers.z], emberMaterial);
    const light = new THREE.PointLight(FIRE_LIGHT.color, intensity, FIRE_LIGHT.range, 2);
    light.position.set(lightPosition.x, lightPosition.y, lightPosition.z);
    this.#scene.add(emberMesh, light);
    this.#flames.push(new GlowingLight(light, emberMaterial, { intensity, glow: EMBER_GLOW }));
  }
}
