import { clamp01 } from '../../utils.js';

/**
 * How close the ghost is, in the forms the effects need. Each is 0 when far away and 1 at contact.
 * @typedef {object} Threat
 * @property {number} closeness - Drives the heartbeat and the red vignette.
 * @property {number} interference - Drives the flashlight flicker.
 */

/** @type {Threat} */
export const NO_THREAT = Object.freeze({ closeness: 0, interference: 0 });

/**
 * @param {number} distance - Meters between the ghost and the player.
 * @returns {Threat}
 */
export function measureThreat(distance, { heartbeatDistance, flickerDistance }) {
  return {
    closeness: clamp01(1 - distance / heartbeatDistance),
    interference: clamp01(1 - distance / flickerDistance),
  };
}
