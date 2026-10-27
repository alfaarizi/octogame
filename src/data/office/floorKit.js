/**
 * @file What every floor of the office is described with: the FloorLayout shape, shared measurements and
 * colors, and builders for furniture. Units are meters, measured on a floor as if it stood at height 0.
 */

import { deepFreeze } from '../../utils.js';

/** @typedef {import('../../types.js').Box} Box */
/** @typedef {import('../../types.js').CandySpot} CandySpot */
/** @typedef {import('../../types.js').FloorPoint} FloorPoint */
/** @typedef {import('../../types.js').Point3} Point3 */
/** @typedef {import('../../types.js').Rect} Rect */
/** @typedef {import('../../world/StairFlight.js').StairFlightPlan} StairFlightPlan */

/** @typedef {Box & { color: number }} FurniturePart */

/**
 * A piece of furniture: its `footprint` is what the player bumps into (null for things you walk over or past,
 * like rugs and office chairs), and its `parts` are the boxes it's drawn with.
 * @typedef {{ name: string, footprint: Rect | null, parts: FurniturePart[] }} FurniturePiece
 */

/**
 * A jack-o'-lantern: where it sits, and the point its carved face turns toward.
 * @typedef {Point3 & { facing: FloorPoint }} Lantern
 */

/**
 * Something that glows on its own and lights the area around it.
 * @typedef {{ name: string, box: Box, color: number, light: Point3 }} GlowingFixture
 */

/**
 * One floor of the office. A tile's column runs along x (east) and its row along z (south).
 * @typedef {object} FloorLayout
 * @property {readonly string[]} tiles - One character per tile (see Tile in world/TileMap.js).
 * @property {readonly FurniturePiece[]} furniture
 * @property {readonly Lantern[]} lanterns
 * @property {readonly GlowingFixture[]} fixtures
 * @property {readonly FloorPoint[]} portraits - Each hangs on the north wall at (x, z), facing south.
 * @property {readonly CandySpot[]} candySpots - Each round picks a few, at most two per room. `y` is the height it floats at.
 * @property {readonly Point3[]} batterySpots
 * @property {readonly FloorPoint[]} ghostSpots - Where the ghost can appear and drift between.
 * @property {readonly StairFlightPlan[]} stairs - The flights up to the floor above.
 */

/** From one floor up to the next. Floors are drawn without thickness, so this is also every room's height. */
export const STOREY_HEIGHT = 3;
export const DESK_HEIGHT = 0.76;
export const SEAT_HEIGHT = 0.42;
const CHAIR = deepFreeze({ halfWidth: 0.23, seatBottom: 0.4, seatTop: 0.48, backTop: 0.95, backThickness: 0.07 });
const SEAT_BACK = deepFreeze({ depth: 0.2, top: 0.8 });

export const Color = deepFreeze({
  DESK: 0x6b4226,
  DESK_FRAME: 0x2b2b2e,
  CHAIR: 0x303236,
  MEETING_TABLE: 0x3b2a20,
  WHITE_TABLE: 0xd8d8d4,
  WHITE_FURNITURE: 0xe6e4df,
  SHELF: 0xcfcac2,
  CABINET: 0x3c3f44,
  PRINTER: 0x2e2e30,
  PILLAR: 0x8a8680,
  SERVER: 0x1b1d20,
  PORCELAIN: 0xd2d2ca,
  SINK: 0xbfc4c6,
  CRATE: 0x8a6a3c,
  FIRST_AID: 0x8c2a22,
  RUG: 0x1f3324,
  RUG_TRIM: 0xa08a3c,
  STONE: 0x9a9a96,
  STEP_EDGE: 0x55524d,
  SIGN: 0xe8e2d0,
  POLE: 0x9a9a9a,
  FLAG: 0x111111,
  PALM_TRUNK: 0x6b5235,
  PALM_LEAF: 0x4f7a2a,
  SHRUB: 0x3d5a26,
  BOLLARD: 0x777777,
  WOOD: 0x5a3a24,
  COUNTER: 0x4a3426,
  COUNTER_TOP: 0x8d8a84,
  APPLIANCE: 0xc9ccce,
  SOFA: 0x5d6064,
  CUSHION: 0x7a5236,
  PING_PONG: 0x2c4a86,
  GYM: 0x26282b,
  PARTITION: 0xa9a49b,
  PLANTER: 0x6e5a48,
});

/**
 * A box spanning x0 to x1 and z0 to z1 on the floor plan, and y0 to y1 in height.
 * @returns {FurniturePart}
 */
export const box = (x0, z0, x1, z1, y0, y1, color) => ({ x0, z0, x1, z1, y0, y1, color });

/**
 * A floor-plan rectangle: what the player bumps into.
 * @returns {Rect}
 */
export const area = (x0, z0, x1, z1) => ({ x0, z0, x1, z1 });

/** @returns {FurniturePiece} */
export const piece = (name, footprint, parts) => ({ name, footprint, parts });

/** A solid block standing on the floor, which is also its own footprint. */
export const block = (name, x0, z0, x1, z1, height, color) =>
  piece(name, area(x0, z0, x1, z1), [box(x0, z0, x1, z1, 0, height, color)]);

/** A table top on four legs. */
export function table(x0, z0, x1, z1, height, color) {
  const top = 0.07, leg = 0.08, inset = 0.05;
  const left = x0 + inset, right = x1 - inset - leg, near = z0 + inset, far = z1 - inset - leg;
  return [
    box(x0, z0, x1, z1, height - top, height, color),
    box(left, near, left + leg, near + leg, 0, height - top, color),
    box(right, near, right + leg, near + leg, 0, height - top, color),
    box(left, far, left + leg, far + leg, 0, height - top, color),
    box(right, far, right + leg, far + leg, 0, height - top, color),
  ];
}

/** An office desk: a top on two side panels, which stand at its short ends. */
export function deskParts(x0, z0, x1, z1) {
  const top = box(x0, z0, x1, z1, DESK_HEIGHT - 0.04, DESK_HEIGHT, Color.DESK);
  const legTop = DESK_HEIGHT - 0.04, inset = 0.03, thickness = 0.04;
  if (x1 - x0 >= z1 - z0) {
    return [
      top,
      box(x0 + inset, z0 + inset, x0 + inset + thickness, z1 - inset, 0, legTop, Color.DESK_FRAME),
      box(x1 - inset - thickness, z0 + inset, x1 - inset, z1 - inset, 0, legTop, Color.DESK_FRAME),
    ];
  }
  return [
    top,
    box(x0 + inset, z0 + inset, x1 - inset, z0 + inset + thickness, 0, legTop, Color.DESK_FRAME),
    box(x0 + inset, z1 - inset - thickness, x1 - inset, z1 - inset, 0, legTop, Color.DESK_FRAME),
  ];
}

/**
 * An office chair centered on (x, z). Its backrest is on the side away from where the sitter faces.
 * @param {number} x
 * @param {number} z
 * @param {FloorPoint} facing - A Compass direction.
 */
export function chairParts(x, z, facing) {
  const { halfWidth: h, seatBottom, seatTop, backTop, backThickness } = CHAIR;
  const backX = x - facing.x * (h - backThickness / 2), backZ = z - facing.z * (h - backThickness / 2);
  const backHalfX = facing.x === 0 ? h : backThickness / 2, backHalfZ = facing.z === 0 ? h : backThickness / 2;
  return [
    box(x - 0.04, z - 0.04, x + 0.04, z + 0.04, 0, seatBottom, Color.DESK_FRAME),
    box(x - h, z - h, x + h, z + h, seatBottom, seatTop, Color.CHAIR),
    box(backX - backHalfX, backZ - backHalfZ, backX + backHalfX, backZ + backHalfZ, seatTop, backTop, Color.CHAIR),
  ];
}

/**
 * A seat with a raised back along one side: an armchair, a sofa, or a toilet and its tank.
 * @param {FloorPoint} back - The Compass direction of the side with the back.
 */
export function seat(name, x0, z0, x1, z1, back, color) {
  const depth = SEAT_BACK.depth;
  return piece(name, area(x0, z0, x1, z1), [
    box(x0, z0, x1, z1, 0, SEAT_HEIGHT, color),
    box(
      back.x > 0 ? x1 - depth : x0,
      back.z > 0 ? z1 - depth : z0,
      back.x < 0 ? x0 + depth : x1,
      back.z < 0 ? z0 + depth : z1,
      SEAT_HEIGHT,
      SEAT_BACK.top,
      color,
    ),
  ]);
}

/** A backless seat centered on (x, z), `height` tall. */
export const stoolParts = (x, z, height, color) => [
  box(x - 0.04, z - 0.04, x + 0.04, z + 0.04, 0, height - 0.05, Color.DESK_FRAME),
  box(x - 0.17, z - 0.17, x + 0.17, z + 0.17, height - 0.05, height, color),
];

/**
 * A desk and its chairs. Chairs don't block the way, so only the desk is a footprint.
 * @param {{ x: number, z: number, facing: FloorPoint }[]} chairs
 */
export const desk = (name, x0, z0, x1, z1, chairs = []) =>
  piece(name, area(x0, z0, x1, z1), [...deskParts(x0, z0, x1, z1), ...chairs.flatMap(({ x, z, facing }) => chairParts(x, z, facing))]);

/**
 * A straight flight of stairs that climbs from `low` to `high` toward `rises`.
 * @param {Rect} rect
 * @param {FloorPoint} rises - A Compass direction.
 * @param {number} low
 * @param {number} high
 * @param {FloorPoint[]} [rails] - Compass directions of the open sides, which get a parapet.
 * @returns {StairFlightPlan}
 */
export const flight = (rect, rises, low, high, rails = []) => ({ rect, rises, low, high, rails });

/**
 * A flat landing between flights.
 * @param {Rect} rect
 * @param {number} height
 * @returns {StairFlightPlan}
 */
export const landing = (rect, height) => ({ rect, rises: null, low: height, high: height, rails: [] });
