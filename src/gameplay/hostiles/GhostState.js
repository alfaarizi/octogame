export const GhostState = Object.freeze({
  DORMANT: 'dormant',
  WANDERING: 'wandering',
  HUNTING: 'hunting',
  FROZEN: 'frozen',
  BANISHED: 'banished',
});

/** @typedef {(typeof GhostState)[keyof typeof GhostState]} GhostStateName */

/**
 * States in which the ghost is in the house and can be seen, lit or touched.
 * @type {ReadonlySet<GhostStateName>}
 */
export const PRESENT_GHOST_STATES = new Set([GhostState.WANDERING, GhostState.HUNTING, GhostState.FROZEN]);
