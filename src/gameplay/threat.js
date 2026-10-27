import { clamp01 } from '../core/math.js';

export const NO_THREAT = Object.freeze({ closeness: 0, interference: 0 });

/**
 * How close the ghost is, in the forms the effects need (each 0 when far, 1 when touching):
 * `closeness` drives the heartbeat and red vignette, `interference` the flashlight flicker.
 */
export function measureThreat(distance, { heartbeatDistance, flickerDistance }) {
  return {
    closeness: clamp01(1 - distance / heartbeatDistance),
    interference: clamp01(1 - distance / flickerDistance),
  };
}
