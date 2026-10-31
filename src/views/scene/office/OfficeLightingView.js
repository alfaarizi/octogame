import * as THREE from 'three';
import { GameEvent } from '../../../core/GameEvent.js';
import { atHeight, Countdown, headingTo, pointAlongHeading } from '../../../utils.js';
import { createBoxMeshFromBounds } from '../meshes.js';
import { GlowingLight } from './GlowingLight.js';
import { createLanternModel, LANTERN_FACE_GLOW } from './lanternModel.js';

/** @typedef {import('../../../models/level/parseLevel.js').GlowingFixture} GlowingFixture */
/** @typedef {import('../../../models/level/parseLevel.js').Lantern} Lantern */

/** Height from the surface a lantern sits on to the pumpkin's center. */
const LANTERN_SEAT_OFFSET = 0.13;
const LANTERN_LIGHT = Object.freeze({ color: 0xff8a2a, range: 4.5, forwardOffset: 0.25, heightOffset: 0.25 });
const FIXTURE_LIGHT_RANGE = 4.5;
const FIXTURE_GLOW = 1.4;
const STUTTER_DEPTH = 0.6;
const StutterDuration = Object.freeze({ EXIT_UNLOCKED: 1.6, AMBIENT_NOISE: 0.4 });

/**
 * The jack-o'-lanterns and the things that glow on their own (server lights, a monitor, a neon sign): warm or
 * cold lights that stay steady until the exit opens or a spooky noise briefly dims them.
 */
export class OfficeLightingView {
  #scene;
  #lights = [];
  #stutter = new Countdown();
  #stutterDuration = 0;

  /**
   * @param {THREE.Scene} scene
   * @param {import('../../../core/EventBus.js').EventBus} events
   * @param {object} setup
   * @param {readonly Lantern[]} setup.lanterns
   * @param {readonly GlowingFixture[]} setup.fixtures
   * @param {number} setup.lanternIntensity
   * @param {number} setup.fixtureIntensity
   */
  constructor(scene, events, { lanterns, fixtures, lanternIntensity, fixtureIntensity }) {
    this.#scene = scene;
    for (const lantern of lanterns) this.#addLantern(lantern, lanternIntensity);
    for (const fixture of fixtures) this.#addFixture(fixture, fixtureIntensity);
    events.on(GameEvent.EXIT_UNLOCKED, () => this.stutterAll(StutterDuration.EXIT_UNLOCKED));
    events.on(GameEvent.AMBIENT_NOISE, ({ flickerLanterns }) => flickerLanterns && this.stutterAll(StutterDuration.AMBIENT_NOISE));
  }

  /** Makes every light stutter for at least `seconds`. */
  stutterAll(seconds) {
    this.#stutterDuration = Math.max(this.#stutter.remaining, seconds);
    this.#stutter.restart(this.#stutterDuration);
  }

  update(seconds) {
    const finished = this.#stutter.tick(seconds);
    const progress = finished ? 0 : this.#stutter.remaining / this.#stutterDuration;
    const strength = 1 - STUTTER_DEPTH * Math.sin(Math.PI * progress) ** 2;
    for (const light of this.#lights) light.setStrength(strength);
  }

  /** @param {Lantern} lantern */
  #addLantern({ x, y, z, lookAt }, intensity) {
    const { object, glowMaterial } = createLanternModel();
    const heading = headingTo({ x, z }, lookAt);
    object.position.set(x, y + LANTERN_SEAT_OFFSET, z);
    object.rotation.y = heading;
    const lightPosition = atHeight(pointAlongHeading({ x, z }, heading, LANTERN_LIGHT.forwardOffset), y + LANTERN_LIGHT.heightOffset);
    this.#addLight(object, new GlowingLight({ ...LANTERN_LIGHT, intensity, position: lightPosition }, glowMaterial, LANTERN_FACE_GLOW));
  }

  /** @param {GlowingFixture} fixture */
  #addFixture({ box, color, light }, intensity) {
    const material = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, emissive: color });
    const glow = new GlowingLight({ color, intensity, range: FIXTURE_LIGHT_RANGE, position: light }, material, FIXTURE_GLOW);
    this.#addLight(createBoxMeshFromBounds(box, material), glow);
  }

  #addLight(object, light) {
    this.#scene.add(object, light.light);
    this.#lights.push(light);
  }
}
