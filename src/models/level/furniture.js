/**
 * @file Furniture as the level files describe it: each piece is a name and a list of parts, and each part is one
 * kind of shape (a box, a table, a desk, a chair, a stool or a seat). This turns a piece into the boxes it's drawn
 * with and the footprint the player bumps into. Measurements are on a floor as if it stood at height 0.
 */

import { LevelFormatError, box, compass, floorPoint, list, number, object, rect, text, boolean } from './validate.js';

/** @typedef {import('../../types.js').Box} Box */
/** @typedef {import('../../types.js').FloorPoint} FloorPoint */
/** @typedef {import('../../types.js').Rect} Rect */

/** @typedef {Box & { color: number }} FurniturePart */

/**
 * A piece of furniture: its `footprint` is what the player bumps into (null for things you walk over or past,
 * like rugs and office chairs), and its `parts` are the boxes it's drawn with.
 * @typedef {{ name: string, footprint: Rect | null, parts: FurniturePart[] }} FurniturePiece
 */

/**
 * Looks up a palette color by name, or reads a "#rrggbb" value.
 * @typedef {(color: unknown, path: string) => number} Paint
 */

export const DESK_HEIGHT = 0.76;
export const SEAT_HEIGHT = 0.42;
const TABLE = Object.freeze({ topThickness: 0.07, legWidth: 0.08, legInset: 0.05 });
const DESK = Object.freeze({ topThickness: 0.04, panelInset: 0.03, panelThickness: 0.04 });
const CHAIR = Object.freeze({ halfWidth: 0.23, stemHalfWidth: 0.04, seatBottom: 0.4, seatTop: 0.48, backTop: 0.95, backThickness: 0.07 });
const SEAT_BACK = Object.freeze({ depth: 0.2, top: 0.8 });
const STOOL = Object.freeze({ stemHalfWidth: 0.04, seatHalfWidth: 0.17, seatThickness: 0.05 });
/** Palette colors the desks, chairs and stools are always drawn in. */
const FrameColor = Object.freeze({ DESK_TOP: 'desk', DESK_FRAME: 'deskFrame', CHAIR: 'chair' });

const partBox = (x0, z0, x1, z1, y0, y1, color) => ({ x0, z0, x1, z1, y0, y1, color });

/**
 * One kind of part: how to read it from its JSON, and whether it blocks the way.
 * @typedef {object} PartKind
 * @property {boolean} isSolid - Whether its rectangle counts toward the piece's footprint.
 * @property {(part: Record<string, unknown>, path: string, paint: Paint) => FurniturePart[]} build
 */

/** @type {Readonly<Record<string, PartKind>>} Keyed by the JSON field that names the kind, e.g. `{ "table": [...] }`. */
const PART_KINDS = Object.freeze({
  box: {
    isSolid: true,
    build: (part, path, paint) => {
      const { x0, z0, x1, z1, y0, y1 } = box(part.box, `${path}.box`);
      return [partBox(x0, z0, x1, z1, y0, y1, paint(part.color, `${path}.color`))];
    },
  },
  table: {
    isSolid: true,
    build: (part, path, paint) => tableParts(rect(part.table, `${path}.table`), number(part.height, `${path}.height`), paint(part.color, `${path}.color`)),
  },
  desk: {
    isSolid: true,
    build: (part, path, paint) => deskParts(rect(part.desk, `${path}.desk`), paint),
  },
  seat: {
    isSolid: true,
    build: (part, path, paint) => seatParts(rect(part.seat, `${path}.seat`), compass(part.back, `${path}.back`), paint(part.color, `${path}.color`)),
  },
  chair: {
    isSolid: false,
    build: (part, path, paint) => chairParts(floorPoint(part.chair, `${path}.chair`), compass(part.facing, `${path}.facing`), paint),
  },
  stool: {
    isSolid: false,
    build: (part, path, paint) =>
      stoolParts(floorPoint(part.stool, `${path}.stool`), number(part.height, `${path}.height`), paint(part.color, `${path}.color`), paint),
  },
});

/**
 * Reads one piece of furniture from its JSON. Unless it says otherwise, a piece's footprint is the bounding
 * rectangle of its solid parts; `"solid": false` gives it none, and `"footprint": [x0, z0, x1, z1]` sets it.
 * @param {unknown} json
 * @param {string} path - Where the piece is in the level files, for error messages.
 * @param {Paint} paint
 * @returns {FurniturePiece}
 */
export function readFurniturePiece(json, path, paint) {
  const piece = object(json, path);
  const name = text(piece.name, `${path}.name`);
  const parts = list(piece.parts, `${path}.parts`, (part, partPath) => readPart(part, partPath, paint));
  if (parts.length === 0) throw new LevelFormatError(`${path}.parts`, 'expected at least one part');
  return { name, footprint: footprintOf(piece, path, parts), parts: parts.flatMap((part) => part.boxes) };
}

/**
 * @param {Paint} paint
 * @returns {{ solidRect: Rect | null, boxes: FurniturePart[] }} The part's boxes, and its rectangle on the
 *   floor plan if it blocks the way.
 */
function readPart(json, path, paint) {
  const part = object(json, path);
  const kinds = Object.keys(PART_KINDS).filter((kind) => kind in part);
  if (kinds.length !== 1) {
    throw new LevelFormatError(path, `expected exactly one of ${Object.keys(PART_KINDS).map((kind) => `"${kind}"`).join(', ')}, found ${kinds.length}`);
  }
  const [kind] = kinds;
  const boxes = PART_KINDS[kind].build(part, path, paint);
  if (!PART_KINDS[kind].isSolid) return { solidRect: null, boxes };
  // Solid kinds are laid out as [x0, z0, x1, z1, ...], already checked by build().
  const [x0, z0, x1, z1] = /** @type {number[]} */ (part[kind]);
  return { solidRect: { x0, z0, x1, z1 }, boxes };
}

/**
 * @param {{ solidRect: Rect | null }[]} parts
 * @returns {Rect | null}
 */
function footprintOf(piece, path, parts) {
  if (piece.footprint !== undefined) return rect(piece.footprint, `${path}.footprint`);
  if (piece.solid !== undefined && !boolean(piece.solid, `${path}.solid`)) return null;
  const solidRects = parts.map((part) => part.solidRect).filter((solidRect) => solidRect !== null);
  if (solidRects.length === 0) return null;
  return {
    x0: Math.min(...solidRects.map((r) => r.x0)),
    z0: Math.min(...solidRects.map((r) => r.z0)),
    x1: Math.max(...solidRects.map((r) => r.x1)),
    z1: Math.max(...solidRects.map((r) => r.z1)),
  };
}

/** A table top on four legs. */
function tableParts({ x0, z0, x1, z1 }, height, color) {
  const { topThickness: top, legWidth: leg, legInset: inset } = TABLE;
  const left = x0 + inset, right = x1 - inset - leg, near = z0 + inset, far = z1 - inset - leg;
  return [
    partBox(x0, z0, x1, z1, height - top, height, color),
    partBox(left, near, left + leg, near + leg, 0, height - top, color),
    partBox(right, near, right + leg, near + leg, 0, height - top, color),
    partBox(left, far, left + leg, far + leg, 0, height - top, color),
    partBox(right, far, right + leg, far + leg, 0, height - top, color),
  ];
}

/**
 * An office desk: a top on two side panels, which stand at its short ends.
 * @param {Paint} paint
 */
function deskParts({ x0, z0, x1, z1 }, paint) {
  const { topThickness, panelInset: inset, panelThickness: thickness } = DESK;
  const legTop = DESK_HEIGHT - topThickness;
  const topColor = paint(FrameColor.DESK_TOP, 'palette'), frameColor = paint(FrameColor.DESK_FRAME, 'palette');
  const top = partBox(x0, z0, x1, z1, legTop, DESK_HEIGHT, topColor);
  if (x1 - x0 >= z1 - z0) {
    return [
      top,
      partBox(x0 + inset, z0 + inset, x0 + inset + thickness, z1 - inset, 0, legTop, frameColor),
      partBox(x1 - inset - thickness, z0 + inset, x1 - inset, z1 - inset, 0, legTop, frameColor),
    ];
  }
  return [
    top,
    partBox(x0 + inset, z0 + inset, x1 - inset, z0 + inset + thickness, 0, legTop, frameColor),
    partBox(x0 + inset, z1 - inset - thickness, x1 - inset, z1 - inset, 0, legTop, frameColor),
  ];
}

/**
 * An office chair centered on `at`. Its backrest is on the side away from where the sitter faces.
 * @param {FloorPoint} at
 * @param {FloorPoint} facing - A Compass direction.
 * @param {Paint} paint
 */
function chairParts({ x, z }, facing, paint) {
  const { halfWidth: h, stemHalfWidth: stem, seatBottom, seatTop, backTop, backThickness } = CHAIR;
  const seatColor = paint(FrameColor.CHAIR, 'palette'), frameColor = paint(FrameColor.DESK_FRAME, 'palette');
  const backX = x - facing.x * (h - backThickness / 2), backZ = z - facing.z * (h - backThickness / 2);
  const backHalfX = facing.x === 0 ? h : backThickness / 2, backHalfZ = facing.z === 0 ? h : backThickness / 2;
  return [
    partBox(x - stem, z - stem, x + stem, z + stem, 0, seatBottom, frameColor),
    partBox(x - h, z - h, x + h, z + h, seatBottom, seatTop, seatColor),
    partBox(backX - backHalfX, backZ - backHalfZ, backX + backHalfX, backZ + backHalfZ, seatTop, backTop, seatColor),
  ];
}

/**
 * A seat with a raised back along one side: an armchair, a sofa, or a toilet and its tank.
 * @param {FloorPoint} back - The Compass direction of the side with the back.
 */
function seatParts({ x0, z0, x1, z1 }, back, color) {
  const depth = SEAT_BACK.depth;
  return [
    partBox(x0, z0, x1, z1, 0, SEAT_HEIGHT, color),
    partBox(
      back.x > 0 ? x1 - depth : x0,
      back.z > 0 ? z1 - depth : z0,
      back.x < 0 ? x0 + depth : x1,
      back.z < 0 ? z0 + depth : z1,
      SEAT_HEIGHT,
      SEAT_BACK.top,
      color,
    ),
  ];
}

/**
 * A backless seat centered on `at`, `height` tall.
 * @param {Paint} paint
 */
function stoolParts({ x, z }, height, color, paint) {
  const { stemHalfWidth: stem, seatHalfWidth: seat, seatThickness } = STOOL;
  return [
    partBox(x - stem, z - stem, x + stem, z + stem, 0, height - seatThickness, paint(FrameColor.DESK_FRAME, 'palette')),
    partBox(x - seat, z - seat, x + seat, z + seat, height - seatThickness, height, color),
  ];
}
