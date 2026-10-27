import { degreesToRadians, isWithinCone } from '../../utils.js';

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
