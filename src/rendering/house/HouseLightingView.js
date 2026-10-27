import * as THREE from 'three';
import { GameEvent } from '../../core/GameEvent.js';
import { atHeight, chance, Countdown, headingTo, pointAlongHeading } from '../../utils.js';
import { createBoxMeshFromBounds } from '../meshes.js';
import { GlowingLight } from './GlowingLight.js';
import { createLanternModel, LANTERN_FACE_GLOW } from './lanternModel.js';

/** @typedef {import('../../data/houseLayout.js').Lantern} Lantern */
/** @typedef {import('../../types.js').Box} Box */
/** @typedef {import('../../types.js').Point3} Point3 */

/** Height from the surface a lantern sits on to the pumpkin's center. */
const LANTERN_SEAT_OFFSET = 0.13;
const LANTERN_LIGHT = Object.freeze({ color: 0xff8a2a, range: 4.5, forwardOffset: 0.25, heightOffset: 0.25 });
const FIRE_LIGHT = Object.freeze({ color: 0xff5014, range: 5 });
const EMBER_GLOW = 1.2;
/** Each flame's strength is `base + swing * sin(rate1 * t) * sin(rate2 * t)`, offset per flame so they don't sync up. */
const FLICKER = Object.freeze({ base: 0.85, swing: 0.15, rates: [8.3, 13.1], phaseSteps: [2.1, 5.3] });
const STUTTER = Object.freeze({ dropChance: 0.45, dropped: 0.05, flare: 1.5 });
const StutterDuration = Object.freeze({ EXIT_UNLOCKED: 1.6, AMBIENT_NOISE: 0.4 });

/**
 * The jack-o'-lanterns and the fireplace: warm lights that flicker, and all stutter at once
 * when the exit opens or a spooky noise asks for it.
 */
export class HouseLightingView {
  #scene;
  #flames = [];
  #stutter = new Countdown();

  /**
   * @param {THREE.Scene} scene
   * @param {import('../../core/EventBus.js').EventBus} events
   * @param {object} setup
   * @param {readonly Lantern[]} setup.lanterns
   * @param {{ embers: Box, light: Point3 }} setup.fireplace
   * @param {number} setup.lanternIntensity
   * @param {number} setup.fireIntensity
   */
  constructor(scene, events, { lanterns, fireplace, lanternIntensity, fireIntensity }) {
    this.#scene = scene;
    for (const lantern of lanterns) this.#addLantern(lantern, lanternIntensity);
    this.#addFireplace(fireplace, fireIntensity);
    events.on(GameEvent.EXIT_UNLOCKED, () => this.stutterAll(StutterDuration.EXIT_UNLOCKED));
    events.on(GameEvent.AMBIENT_NOISE, ({ flickerLanterns }) => flickerLanterns && this.stutterAll(StutterDuration.AMBIENT_NOISE));
  }

  /** Makes every light stutter for at least `seconds`. */
  stutterAll(seconds) {
    this.#stutter.restart(Math.max(this.#stutter.remaining, seconds));
  }

  update(seconds, time) {
    const isStuttering = !this.#stutter.tick(seconds);
    const [rate1, rate2] = FLICKER.rates, [phaseStep1, phaseStep2] = FLICKER.phaseSteps;
    this.#flames.forEach((flame, index) => {
      let strength = FLICKER.base + FLICKER.swing * Math.sin(time * rate1 + index * phaseStep1) * Math.sin(time * rate2 + index * phaseStep2);
      if (isStuttering) strength *= chance(STUTTER.dropChance) ? STUTTER.dropped : STUTTER.flare;
      flame.setStrength(strength);
    });
  }

  /** @param {Lantern} lantern */
  #addLantern({ x, y, z, facing }, intensity) {
    const { object, glowMaterial } = createLanternModel();
    const heading = headingTo({ x, z }, facing);
    object.position.set(x, y + LANTERN_SEAT_OFFSET, z);
    object.rotation.y = heading;
    const lightPosition = atHeight(pointAlongHeading({ x, z }, heading, LANTERN_LIGHT.forwardOffset), y + LANTERN_LIGHT.heightOffset);
    this.#addFlame(object, new GlowingLight({ ...LANTERN_LIGHT, intensity, position: lightPosition }, glowMaterial, LANTERN_FACE_GLOW));
  }

  #addFireplace({ embers, light }, intensity) {
    const emberMaterial = new THREE.MeshStandardMaterial({ color: 0x1a0a04, emissive: 0xff4010 });
    const emberMesh = createBoxMeshFromBounds(embers, emberMaterial);
    this.#addFlame(emberMesh, new GlowingLight({ ...FIRE_LIGHT, intensity, position: light }, emberMaterial, EMBER_GLOW));
  }

  #addFlame(object, flame) {
    this.#scene.add(object, flame.light);
    this.#flames.push(flame);
  }
}
