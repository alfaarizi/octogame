import { degreesToRadians } from '../core/math.js';

const MIN_WIDTH_DISTANCE = 0.1;

/**
 * True when `target` is within `halfAngle` of `direction` as seen from `eye`, and no farther than `range`.
 * `targetRadius` widens the cone for big targets, which matters most up close. Points are { x, y, z }.
 */
export function isWithinCone(eye, direction, target, halfAngle, range, targetRadius = 0) {
  const tx = target.x - eye.x, ty = target.y - eye.y, tz = target.z - eye.z;
  const distance = Math.hypot(tx, ty, tz);
  if (distance > range) return false;
  if (distance < 1e-6) return true;
  const directionLength = Math.hypot(direction.x, direction.y, direction.z);
  const cosine = (tx * direction.x + ty * direction.y + tz * direction.z) / (distance * directionLength);
  const angle = Math.acos(Math.min(1, Math.max(-1, cosine)));
  return angle <= halfAngle + Math.atan(targetRadius / Math.max(distance, MIN_WIDTH_DISTANCE));
}

/** Whether the flashlight is actually shining on something: inside the freeze cone, with no wall in the way. */
export class FlashlightBeam {
  #tileMap;
  #range;
  #halfAngle;

  constructor(tileMap, { freezeRange, freezeAngleDegrees }) {
    this.#tileMap = tileMap;
    this.#range = freezeRange;
    this.#halfAngle = degreesToRadians(freezeAngleDegrees);
  }

  illuminates(eye, direction, target, targetRadius) {
    return (
      isWithinCone(eye, direction, target, this.#halfAngle, this.#range, targetRadius) &&
      this.#tileMap.hasLineOfSight(eye, target)
    );
  }
}
