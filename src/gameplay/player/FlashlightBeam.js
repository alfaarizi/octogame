import { isWithinCone } from '../../utils.js';

/** @typedef {import('../../types.js').Cone} Cone */
/** @typedef {import('../../types.js').Point3} Point3 */
/** @typedef {import('../../types.js').Ray} Ray */

/** Whether the flashlight is actually shining on something: inside the freeze cone, with no wall in the way. */
export class FlashlightBeam {
  #tileMap;
  #cone;

  /** @param {Cone} freezeCone */
  constructor(tileMap, freezeCone) {
    this.#tileMap = tileMap;
    this.#cone = freezeCone;
  }

  /**
   * @param {Ray} sight - Where the beam starts and points.
   * @param {Point3} target
   * @param {number} targetRadius
   */
  illuminates(sight, target, targetRadius) {
    return isWithinCone(sight, this.#cone, target, targetRadius) && this.#tileMap.hasLineOfSight(sight.origin, target);
  }
}
