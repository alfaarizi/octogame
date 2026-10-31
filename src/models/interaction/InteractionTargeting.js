import { distanceBetween, isWithinCone } from '../../utils.js';

/** Shared aim/reach rules for prompts and actions; walls and furniture occlude both. */
export class InteractionTargeting {
  constructor(building, cone) { this.building = building; this.cone = cone; }

  find(sight, candidates) {
    return candidates
      .filter((candidate) => isWithinCone(sight, this.cone, candidate.position, 0.12)
        && this.building.hasClearRay(sight.origin, candidate.position))
      .sort((a, b) => alignment(sight, b.position) - alignment(sight, a.position)
        || distanceBetween(sight.origin, a.position) - distanceBetween(sight.origin, b.position))[0] ?? null;
  }
}

/** Prefer what is under the crosshair, so a nearby note cannot steal its closet's prompt. */
function alignment({ origin, direction }, position) {
  const distance = distanceBetween(origin, position);
  if (distance < 1e-6) return 1;
  return ((position.x - origin.x) * direction.x + (position.y - origin.y) * direction.y
    + (position.z - origin.z) * direction.z) / distance;
}
