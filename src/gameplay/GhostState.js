export const GhostState = Object.freeze({
  DORMANT: 'dormant',
  WANDERING: 'wandering',
  HUNTING: 'hunting',
  FROZEN: 'frozen',
  BANISHED: 'banished',
});

/** States in which the ghost is in the house and can be seen, lit or touched. */
export const PRESENT_GHOST_STATES = Object.freeze(new Set([GhostState.WANDERING, GhostState.HUNTING, GhostState.FROZEN]));
