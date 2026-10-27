export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const clamp01 = (value) => clamp(value, 0, 1);

export const degreesToRadians = (degrees) => (degrees * Math.PI) / 180;

/** Maps any angle into (-π, π]. */
export const wrapAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** Turns `current` toward `target` the short way round, by `fraction` (0–1) of the gap. */
export const rotateToward = (current, target, fraction) => current + wrapAngle(target - current) * Math.min(1, fraction);

/** Distance between two points on the floor plan, ignoring height. */
export const planarDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** Heading from one floor point to another, in radians, where 0 faces +z. */
export const headingTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
