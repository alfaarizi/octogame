/** @file Builds only exposed faces of authored box assemblies, avoiding coincident depth surfaces. */

const EPSILON = 1e-6;
const FACES = Object.freeze([
  { axis: 'x', sign: -1, coordinate: 'x0', u: 'z', v: 'y' },
  { axis: 'x', sign: 1, coordinate: 'x1', u: 'z', v: 'y' },
  { axis: 'y', sign: -1, coordinate: 'y0', u: 'x', v: 'z' },
  { axis: 'y', sign: 1, coordinate: 'y1', u: 'x', v: 'z' },
  { axis: 'z', sign: -1, coordinate: 'z0', u: 'x', v: 'y' },
  { axis: 'z', sign: 1, coordinate: 'z1', u: 'x', v: 'y' },
]);

const area = ({ u0, u1, v0, v1 }) => (u1 - u0) * (v1 - v0);

/** Returns the fragments of `surface` outside `cover`. */
function subtract(surface, cover) {
  const u0 = Math.max(surface.u0, cover.u0), u1 = Math.min(surface.u1, cover.u1);
  const v0 = Math.max(surface.v0, cover.v0), v1 = Math.min(surface.v1, cover.v1);
  if (u1 - u0 <= EPSILON || v1 - v0 <= EPSILON) return [surface];
  return [
    { ...surface, u1: u0 }, { ...surface, u0: u1 },
    { ...surface, u0, u1, v1: v0 }, { ...surface, u0, u1, v0: v1 },
  ].filter((part) => area(part) > EPSILON);
}

/**
 * An adjoining or overlapping box removes the face beneath it. If two boxes end on the same plane,
 * the larger face owns that plane; equal faces use their authoring order.
 * @param {readonly import('../../types.js').Box[]} boxes
 * @param {readonly import('../../types.js').Box[]} [occluders]
 */
export function visibleBoxFaces(boxes, occluders = boxes) {
  const order = new Map(occluders.map((box, index) => [box, index]));
  const visible = [];
  for (const box of boxes) for (const face of FACES) {
    const plane = box[face.coordinate];
    const u0Key = `${face.u}0`, u1Key = `${face.u}1`;
    const v0Key = `${face.v}0`, v1Key = `${face.v}1`;
    const base = {
      axis: face.axis, sign: face.sign, plane,
      u0: box[u0Key], u1: box[u1Key],
      v0: box[v0Key], v1: box[v1Key],
    };
    let fragments = [base];
    for (const other of occluders) {
      if (other === box) continue;
      if (other[u1Key] <= base.u0 + EPSILON || other[u0Key] >= base.u1 - EPSILON
        || other[v1Key] <= base.v0 + EPSILON || other[v0Key] >= base.v1 - EPSILON) continue;
      const outside = face.sign > 0
        ? other[`${face.axis}0`] <= plane + EPSILON && other[`${face.axis}1`] > plane + EPSILON
        : other[`${face.axis}1`] >= plane - EPSILON && other[`${face.axis}0`] < plane - EPSILON;
      const samePlane = Math.abs(other[face.coordinate] - plane) <= EPSILON;
      const otherArea = (other[u1Key] - other[u0Key]) * (other[v1Key] - other[v0Key]);
      const ownsPlane = samePlane && (otherArea > area(base) + EPSILON
        || (Math.abs(otherArea - area(base)) <= EPSILON && order.get(other) < order.get(box)));
      if (!outside && !ownsPlane) continue;
      const cover = { u0: other[u0Key], u1: other[u1Key], v0: other[v0Key], v1: other[v1Key] };
      fragments = fragments.flatMap((fragment) => subtract(fragment, cover));
      if (fragments.length === 0) break;
    }
    visible.push(...fragments);
  }
  return visible;
}
