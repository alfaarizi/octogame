import * as THREE from 'three';
import { headingTo, randomSpread, rotateToward } from '../../utils.js';
import { GhostState, PRESENT_GHOST_STATES } from '../../gameplay/hostiles/GhostState.js';
import {
  createGhostModel,
  GHOST_EYE_HEIGHT,
  GHOST_GLOW_COLOR,
  GHOST_OPACITY,
  GHOST_PROFILE,
  GHOST_SEGMENTS,
  MOUTH_HEIGHT,
} from './ghostModel.js';

/** @typedef {import('../../gameplay/hostiles/GhostState.js').GhostStateName} GhostStateName */
/** @typedef {import('../../types.js').FloorPoint} FloorPoint */
/** @typedef {import('../../types.js').Ray} Ray */

const PALE_GLOW = new THREE.Color(GHOST_GLOW_COLOR);
const ENRAGED_GLOW = new THREE.Color(0xc01818);
const HOVER = Object.freeze({ base: 0.22, amplitude: 0.07, rate: 1.8 });
const LEAN = Object.freeze({ hunting: 0.14, resting: 0.03 });
const TURN_RATE = 4;
const FADE_IN_SECONDS = 1;
const VANISH = Object.freeze({ seconds: 0.35, growth: 0.7, glow: 1.5 });
const FROZEN = Object.freeze({ jitter: 0.03, glow: 0.6, glowFlicker: 0.4 });
const ENRAGED_BODY_GLOW = 0.35;
const HEM = Object.freeze({ waves: 6, rate: 4, amplitude: 0.07, innerAmplitude: 0.03 });
const JUMP_SCARE = Object.freeze({ distance: 0.75, growth: 0.15, opacity: 0.95, glow: 0.7 });

/** Draws the ghost: hovering, turning, shuddering when lit, bursting when banished, and the jump scare. */
export class GhostView {
  #ghost;
  #parts;
  #glow;
  #time = 0;
  #fadeIn = 0;
  #vanishTime = 0;
  /** @type {GhostStateName} */
  #previousState = GhostState.DORMANT;
  #lookDirection = new THREE.Vector3();

  /**
   * @param {THREE.Scene} scene
   * @param {import('../../gameplay/hostiles/Ghost.js').Ghost} ghost
   * @param {{ glow: number }} appearance - `glow` is the body's resting emissive intensity.
   */
  constructor(scene, ghost, { glow }) {
    this.#ghost = ghost;
    this.#glow = glow;
    this.#parts = createGhostModel(glow);
    this.#parts.object.visible = false;
    scene.add(this.#parts.object);
  }

  hide() {
    this.#parts.object.visible = false;
    this.#previousState = GhostState.DORMANT;
  }

  /**
   * @param {number} seconds - Time since the last frame.
   * @param {FloorPoint} playerPosition - Where it stares while hunting.
   */
  update(seconds, playerPosition) {
    this.#time += seconds;
    this.#noteStateChange();
    const state = this.#ghost.state;
    if (state === GhostState.DORMANT) this.#parts.object.visible = false;
    else if (state === GhostState.BANISHED) this.#animateVanishing(seconds);
    else this.#animatePresence(seconds, playerPosition);
  }

  /**
   * Puts the ghost's face right in front of the viewer, filling the screen.
   * @param {Ray} sight - Where the viewer is and where they look.
   * @param {number} elapsed - Seconds since the jump scare started.
   * @param {number} seconds - Time since the last frame.
   */
  showJumpScare({ origin, direction }, elapsed, seconds) {
    this.#time += seconds;
    this.#lookDirection.set(direction.x, 0, direction.z).normalize();
    const { object, bodyMaterial, mouth, pupils } = this.#parts;
    const scale = 1 + Math.min(elapsed, 1) * JUMP_SCARE.growth;
    object.visible = true;
    object.scale.setScalar(scale);
    object.position.set(
      origin.x + this.#lookDirection.x * JUMP_SCARE.distance,
      origin.y - GHOST_EYE_HEIGHT * scale,
      origin.z + this.#lookDirection.z * JUMP_SCARE.distance,
    );
    object.rotation.set(0, Math.atan2(-this.#lookDirection.x, -this.#lookDirection.z), 0);
    bodyMaterial.opacity = JUMP_SCARE.opacity;
    bodyMaterial.emissiveIntensity = JUMP_SCARE.glow;
    mouth.scale.y = MOUTH_HEIGHT.screaming;
    for (const pupil of pupils) pupil.visible = true;
    this.#rippleHem();
  }

  #noteStateChange() {
    const state = this.#ghost.state;
    if (state === this.#previousState) return;
    if (state === GhostState.BANISHED) this.#vanishTime = 0;
    if (!PRESENT_GHOST_STATES.has(this.#previousState) && PRESENT_GHOST_STATES.has(state)) this.#fadeIn = 0;
    this.#previousState = state;
  }

  /** Bursts outward and fades, then stays hidden until it respawns. */
  #animateVanishing(seconds) {
    const { object, bodyMaterial } = this.#parts;
    this.#vanishTime += seconds;
    const progress = this.#vanishTime / VANISH.seconds;
    object.visible = progress < 1;
    if (!object.visible) return;
    object.scale.setScalar(1 + progress * VANISH.growth);
    bodyMaterial.opacity = GHOST_OPACITY * (1 - progress);
    bodyMaterial.emissiveIntensity = VANISH.glow * (1 - progress);
  }

  #animatePresence(seconds, playerPosition) {
    const ghost = this.#ghost;
    const { object, bodyMaterial, mouth, pupils } = this.#parts;
    const isFrozen = ghost.state === GhostState.FROZEN;
    this.#fadeIn = Math.min(1, this.#fadeIn + seconds / FADE_IN_SECONDS);

    const jitter = isFrozen ? FROZEN.jitter : 0;
    const hover = HOVER.base + Math.sin(this.#time * HOVER.rate) * HOVER.amplitude;
    object.visible = true;
    object.scale.setScalar(1);
    object.position.set(ghost.position.x + randomSpread(jitter), hover + randomSpread(jitter), ghost.position.z + randomSpread(jitter));

    // Faces the way it drifts while wandering; stares at the player otherwise.
    const facing = ghost.state === GhostState.WANDERING ? ghost.heading : headingTo(ghost.position, playerPosition);
    object.rotation.y = rotateToward(object.rotation.y, facing, seconds * TURN_RATE);
    object.rotation.x = ghost.state === GhostState.HUNTING ? LEAN.hunting : LEAN.resting;

    bodyMaterial.opacity = GHOST_OPACITY * this.#fadeIn;
    bodyMaterial.emissive.copy(ghost.isEnraged ? ENRAGED_GLOW : PALE_GLOW);
    bodyMaterial.emissiveIntensity = isFrozen
      ? FROZEN.glow + Math.random() * FROZEN.glowFlicker
      : ghost.isEnraged ? ENRAGED_BODY_GLOW : this.#glow;
    mouth.scale.y = isFrozen ? MOUTH_HEIGHT.frozen : MOUTH_HEIGHT.resting;
    for (const pupil of pupils) pupil.visible = ghost.isEnraged;
    this.#rippleHem();
  }

  /** Waves the bottom edge of the sheet. */
  #rippleHem() {
    const { bodyGeometry, restPositions } = this.#parts;
    const positions = bodyGeometry.attributes.position;
    const pointsPerSegment = GHOST_PROFILE.length;
    for (let segment = 0; segment <= GHOST_SEGMENTS; segment++) {
      const angle = (segment / GHOST_SEGMENTS) * Math.PI * 2;
      const wave = Math.sin(angle * HEM.waves + this.#time * HEM.rate);
      for (let point = 0; point < 2; point++) {
        const yIndex = (segment * pointsPerSegment + point) * 3 + 1;
        positions.array[yIndex] = restPositions[yIndex] + wave * (point === 0 ? HEM.amplitude : HEM.innerAmplitude);
      }
    }
    positions.needsUpdate = true;
  }
}
