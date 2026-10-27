/**
 * @file The office's ground floor as data: the tile grid, furniture, lights and every spawn point.
 * Units are meters. Each tile is TILE_SIZE wide; a tile's column runs along x (east) and its row along z (south).
 * North half: the open-plan office (west), lobby (middle) and workshop (east). South half: the yard, with the
 * server room, toilets, praying room and terrace along the building, and the main gate at the bottom right.
 */

import { deepFreeze } from '../utils.js';

/** @typedef {import('../types.js').Box} Box */
/** @typedef {import('../types.js').CandySpot} CandySpot */
/** @typedef {import('../types.js').FloorPoint} FloorPoint */
/** @typedef {import('../types.js').Point3} Point3 */
/** @typedef {import('../types.js').Rect} Rect */
/** @typedef {import('../types.js').SpawnPoint} SpawnPoint */

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

export const TILE_SIZE = 0.5;
export const WALL_HEIGHT = 2.8;
/** Height of the street fence and the yard's low walls. */
export const LOW_WALL_HEIGHT = 1.6;

/**
 * One character per tile (see Tile in world/TileMap.js):
 *   # wall           F low wall or fence     E main gate (solid; you escape by reaching it once it unlocks)
 *   . office floor   ; wet-room tiles        _ covered parking      : stone paving     , garden paving
 *   o stairwell down to the basement (indoors)   v ramp or stairs down to the basement (outdoors)
 *   (space) outside the grounds
 */
export const TILE_ROWS = deepFreeze([
  '################################################',
  '#.........................................#....#',
  '#.........................................#...##',
  '#....................................###oo#...# ',
  '#......................................#oo#...# ',
  '#......................................#oo#...# ',
  '#......................................#oo#...# ',
  '#......................................####...# ',
  '#............................................## ',
  '#............................................#  ',
  '#............................................#  ',
  '#............................................#  ',
  '#............................................#  ',
  '#............................................#  ',
  '#...........................................##  ',
  '#...........................................#   ',
  '#...........................................#   ',
  '#.....................####..................#   ',
  '####..###..####..######::#..........#########   ',
  '#.......#;;;#::::::::::::#..........#:::::::#   ',
  '#.......#;;;#::::::::::::#####F######::######   ',
  '#.......#;;;#:::::::::::::,,,,Fvvvvvv::;;;;#    ',
  '#.......#;###:::::::::::::,,,,Fvvvvvv::;;;;#    ',
  '#......####:::::::::::::::,,,,Fvvvvvv::#;;;#    ',
  '#....####:::::::::::::::::,,,,F,,,,,,::#####    ',
  '######..#:::::::::::::::::,,,,F,,,,,,::#;;;#    ',
  '#.......#::::,,,,,,,,,,,,,,,,,F,,,,,,::#;;##    ',
  '#.......#::::,,,,,,,,,,,,,,,,,F,,,,,,::;;;#     ',
  '#.......#::::,,,,,,,,,,,,,vvvvv,,,,,,::;;;#     ',
  '#.......#::::,,,,,,,,,,,,,vvvvv,,,,,,::####     ',
  '#.......#::::,,,,,,,,,,,,,vvvvv,,,,,,,,,,,#     ',
  '#........::::,,,,,,,,,,,,,vvvvv,,,,,,,,,,,#     ',
  '#........::::,,,,,,,,,,,,,vvvvv,,,,,,,,,,##     ',
  '#########::::,,,,,,,,,,,,,vvvvv,,,,,,,,,,#      ',
  '#_______,,,,,,,,,,,,,,,,,,vvvvv,,,,,,,,,,#      ',
  '#_______,,,,,,,,,,,,,,,,,,vvvvv,,,,,,,,,,#      ',
  '#_______,,,,,,,,,,,,,,,,,,vvvvv,,,,,,,,,,#      ',
  '#_______,,,,,,,,,,,,,,,,,,vvvvv,,,,,,,,,,#      ',
  '#_______,,,,,,,,,,,,,,,,,,vvvvv,,,,,,,,,##      ',
  '#_______,,,,,,,,,,,,,,,,,,:::::,,,,,,,,,#       ',
  '#_______,,,,,,,,,,,,,,,,,,:::::,,,,,,,,,#       ',
  '#_______,,,,,,,,,,,,,,,,,,:::::,,,,,,,,,#       ',
  '#_______,,,,,,,,,,,,,,,,,,:::::F,,,,,,,,#       ',
  '#_______,,,,,,,,,,,,,,,,,,,,,FFF,,,,,,,,#       ',
  '#_______,,,,,,,,,,,,,,,,,,,,FF EEEEEEEEE#       ',
  '#_______,,,,,,,,,,,,,,,,,,,FF                   ',
  '#_______,,,,,,,,,,,,,,,,,,FF                    ',
  '#_______,,,,,,,,,,,,,FFFFFF                     ',
  '#_______,,,,,FFFFFFFFF                          ',
  '#_____FFFFFFFF                                  ',
  'FFFFFFF                                         ',
  '                                                ',
]);

/** @type {SpawnPoint} In the lobby, just inside the main entrance, facing into the office. */
export const PLAYER_START = deepFreeze({ x: 8.0, z: 8.4, yaw: 0 });
/** @type {FloorPoint} On the landing of the basement stairwell. */
export const GHOST_START = deepFreeze({ x: 20.5, z: 1.0 });

/** @type {import('../world/ExitDoor.js').ExitDoorPlacement & { wallZ: number, width: number, height: number }} */
export const EXIT_DOOR = deepFreeze({
  centerX: 17.75,
  // The gate's inner face
  wallZ: 22.0,
  width: 4.5,
  height: 2.0,
  trigger: { minZ: 21.3, halfWidth: 2.0 },
});

const Color = deepFreeze({
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
  STAIRS: 0x2d2a27,
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
});

/** Which way someone sitting in a chair faces, as a step along x and z. */
const Facing = deepFreeze({ NORTH: { x: 0, z: -1 }, SOUTH: { x: 0, z: 1 }, EAST: { x: 1, z: 0 }, WEST: { x: -1, z: 0 } });

const DESK_HEIGHT = 0.76;
const CHAIR = deepFreeze({ halfWidth: 0.23, seatBottom: 0.4, seatTop: 0.48, backTop: 0.95, backThickness: 0.07 });

/**
 * A box spanning x0 to x1 and z0 to z1 on the floor plan, and y0 to y1 in height.
 * @returns {FurniturePart}
 */
const box = (x0, z0, x1, z1, y0, y1, color) => ({ x0, z0, x1, z1, y0, y1, color });

/**
 * A floor-plan rectangle: what the player bumps into.
 * @returns {Rect}
 */
const area = (x0, z0, x1, z1) => ({ x0, z0, x1, z1 });

/** @returns {FurniturePiece} */
const piece = (name, footprint, parts) => ({ name, footprint, parts });

/** A table top on four legs. */
function table(x0, z0, x1, z1, height, color) {
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
function deskParts(x0, z0, x1, z1) {
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

/** An office chair centered on (x, z). Its backrest is on the side away from where the sitter faces. */
function chairParts(x, z, facing) {
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
 * A desk and its chairs. Chairs don't block the way, so only the desk is a footprint.
 * @param {{ x: number, z: number, facing: FloorPoint }[]} chairs
 */
const desk = (name, x0, z0, x1, z1, chairs = []) =>
  piece(name, area(x0, z0, x1, z1), [...deskParts(x0, z0, x1, z1), ...chairs.flatMap(({ x, z, facing }) => chairParts(x, z, facing))]);

/** Stairs rising from `zLow` (the bottom step) to `zHigh` (the top), each step a solid block down to the floor. */
function staircase(x0, x1, zLow, zHigh, steps, topHeight) {
  const run = (zHigh - zLow) / steps;
  return Array.from({ length: steps }, (_, i) => {
    const near = zLow + run * i, far = near + run;
    return box(x0, Math.min(near, far), x1, Math.max(near, far), 0, (topHeight * (i + 1)) / steps, Color.STAIRS);
  });
}

function palmTree(x, z) {
  return piece('palm tree', area(x - 0.2, z - 0.2, x + 0.2, z + 0.2), [
    box(x - 0.12, z - 0.12, x + 0.12, z + 0.12, 0, 3.2, Color.PALM_TRUNK),
    box(x - 1.3, z - 0.22, x + 1.3, z + 0.22, 3.0, 3.07, Color.PALM_LEAF),
    box(x - 0.22, z - 1.3, x + 0.22, z + 1.3, 3.05, 3.12, Color.PALM_LEAF),
    box(x - 0.35, z - 0.35, x + 0.35, z + 0.35, 3.1, 3.35, Color.PALM_LEAF),
  ]);
}

/** @type {readonly FurniturePiece[]} */
export const FURNITURE = deepFreeze([
  // Office area
  desk('desk (Andri)', 0.55, 0.5, 1.8, 1.05, [{ x: 1.18, z: 1.35, facing: Facing.NORTH }]),
  desk('desk (Ihsan)', 1.8, 0.5, 3.05, 1.05, [{ x: 2.43, z: 1.35, facing: Facing.NORTH }]),
  desk('desk (spare)', 3.05, 0.5, 4.3, 1.05, [{ x: 3.68, z: 1.35, facing: Facing.NORTH }]),
  desk('desk (Ibrahim)', 4.3, 0.5, 5.55, 1.05, [{ x: 4.93, z: 1.35, facing: Facing.NORTH }]),
  desk('desk (uPulse)', 5.55, 0.5, 6.4, 1.5),
  desk('desk (Andrew)', 1.2, 2.7, 2.42, 3.55, [{ x: 1.81, z: 2.4, facing: Facing.SOUTH }]),
  desk('desk (Tempest)', 2.42, 2.7, 3.65, 3.55, [{ x: 3.03, z: 2.4, facing: Facing.SOUTH }]),
  desk('desk (spare, north)', 4.7, 2.7, 5.95, 3.5, [{ x: 5.33, z: 2.4, facing: Facing.SOUTH }]),
  desk('desk (spare, south)', 4.7, 3.5, 5.95, 4.35, [{ x: 5.33, z: 4.65, facing: Facing.NORTH }]),
  piece('printer', area(5.95, 3.1, 6.4, 3.55), [box(5.95, 3.1, 6.4, 3.55, 0, 0.9, Color.PRINTER)]),
  desk('desk (Farib)', 1.0, 3.95, 1.85, 5.2, [{ x: 0.75, z: 4.55, facing: Facing.EAST }]),
  desk('desk (Dila)', 1.0, 5.2, 1.85, 6.45, [{ x: 0.75, z: 5.85, facing: Facing.EAST }]),
  desk('desk (Oji)', 1.0, 6.95, 1.85, 8.2, [{ x: 0.75, z: 7.55, facing: Facing.EAST }]),
  desk('desk (intern 1)', 2.8, 6.6, 4.05, 7.4, [{ x: 3.43, z: 6.3, facing: Facing.SOUTH }]),
  desk('desk (intern 2)', 4.05, 6.6, 5.3, 7.4, [{ x: 4.68, z: 6.3, facing: Facing.SOUTH }]),
  desk('desk (intern 3)', 5.3, 6.6, 6.55, 7.4, [{ x: 5.93, z: 6.3, facing: Facing.SOUTH }]),
  piece('desk (shared printer)', area(2.8, 7.4, 4.05, 8.25), [
    ...deskParts(2.8, 7.4, 4.05, 8.25),
    box(3.1, 7.55, 3.75, 8.1, DESK_HEIGHT, DESK_HEIGHT + 0.35, Color.PRINTER),
  ]),
  desk('desk (Adika)', 4.05, 7.4, 5.3, 8.25, [{ x: 4.68, z: 8.5, facing: Facing.NORTH }]),
  desk('desk (Elsa)', 5.3, 7.4, 6.55, 8.25, [{ x: 5.93, z: 8.5, facing: Facing.NORTH }]),
  desk('desk (Fast)', 11.95, 3.5, 12.75, 4.8, [{ x: 11.7, z: 4.15, facing: Facing.EAST }]),
  piece('printer (Fast)', area(12.3, 3.05, 12.75, 3.5), [box(12.3, 3.05, 12.75, 3.5, 0, 0.9, Color.PRINTER)]),
  piece('desk (3D printing)', area(10.6, 0.5, 11.85, 1.05), [
    ...deskParts(10.6, 0.5, 11.85, 1.05),
    box(10.9, 0.6, 11.5, 1.0, DESK_HEIGHT, DESK_HEIGHT + 0.45, Color.PRINTER),
    ...chairParts(11.23, 1.35, Facing.NORTH),
  ]),
  desk('desk (PC)', 11.85, 0.5, 13.1, 1.05),
  piece('stairs to the second floor', area(8.55, 0.5, 10.3, 4.2), staircase(8.55, 10.3, 4.2, 0.5, 16, WALL_HEIGHT)),

  // Lobby
  piece('lobby partition', area(6.9, 7.4, 7.2, 8.95), [box(6.9, 7.4, 7.2, 8.95, 0, 1.8, Color.WHITE_FURNITURE)]),
  piece('first aid kit', null, [box(6.3, 8.85, 6.7, 9.0, 1.2, 1.55, Color.FIRST_AID)]),
  piece('armchair', area(9.25, 6.65, 10.1, 7.5), [
    box(9.25, 6.65, 10.1, 7.5, 0, 0.42, Color.WHITE_FURNITURE),
    box(9.25, 6.65, 10.1, 6.85, 0.42, 0.85, Color.WHITE_FURNITURE),
  ]),
  piece('armchair', area(9.55, 8.2, 10.35, 9.0), [
    box(9.55, 8.2, 10.35, 9.0, 0, 0.42, Color.WHITE_FURNITURE),
    box(10.15, 8.2, 10.35, 9.0, 0.42, 0.85, Color.WHITE_FURNITURE),
  ]),
  piece('bookshelf', area(10.45, 6.55, 10.8, 8.95), [box(10.45, 6.55, 10.8, 8.95, 0, 1.8, Color.SHELF)]),

  // Workshop
  desk('desk (Marvin)', 14.25, 0.5, 15.45, 1.05, [{ x: 14.85, z: 1.35, facing: Facing.NORTH }]),
  desk('desk (workshop intern)', 16.0, 0.5, 17.25, 1.05, [{ x: 16.63, z: 1.35, facing: Facing.NORTH }]),
  desk('desk (Tuwuh)', 12.75, 2.3, 14.0, 3.1, [{ x: 13.38, z: 2.0, facing: Facing.SOUTH }]),
  desk('desk (Nikko)', 12.75, 3.1, 14.0, 3.95, [{ x: 13.38, z: 4.25, facing: Facing.NORTH }]),
  desk('desk (Kafin)', 15.5, 3.05, 16.35, 4.3, [{ x: 16.6, z: 3.68, facing: Facing.WEST }]),
  desk('desk (Flo)', 16.4, 4.3, 17.65, 5.15),
  desk('desk (Bagas)', 17.65, 4.3, 18.9, 5.15, [{ x: 18.28, z: 4.0, facing: Facing.SOUTH }]),
  piece('column', area(18.6, 3.15, 19.05, 3.6), [box(18.6, 3.15, 19.05, 3.6, 0, WALL_HEIGHT, Color.PILLAR)]),
  piece('meeting table', area(14.95, 6.2, 17.5, 7.4), [
    ...table(14.95, 6.2, 17.5, 7.4, DESK_HEIGHT, Color.MEETING_TABLE),
    ...[15.6, 16.85].flatMap((x) => [5.95, 7.65].flatMap((z) => [
      box(x - 0.04, z - 0.04, x + 0.04, z + 0.04, 0, 0.42, Color.DESK_FRAME),
      box(x - 0.18, z - 0.18, x + 0.18, z + 0.18, 0.42, 0.48, Color.CHAIR),
    ])),
  ]),
  piece('rover track tables', area(18.1, 6.2, 20.6, 7.45), [
    ...table(18.1, 6.2, 19.35, 7.45, DESK_HEIGHT, Color.WHITE_TABLE),
    ...table(19.35, 6.2, 20.6, 7.45, DESK_HEIGHT, Color.WHITE_TABLE),
  ]),
  piece('workbench (east)', area(21.3, 6.0, 21.95, 8.4), [
    ...table(21.3, 6.0, 21.95, 8.4, DESK_HEIGHT, Color.WHITE_TABLE),
    ...chairParts(21.0, 6.5, Facing.EAST),
    ...chairParts(21.0, 7.8, Facing.EAST),
  ]),
  piece('workbench (south)', area(18.7, 8.35, 19.9, 8.95), table(18.7, 8.35, 19.9, 8.95, DESK_HEIGHT, Color.WHITE_TABLE)),
  piece('workbench (south)', area(20.0, 8.4, 21.0, 8.95), table(20.0, 8.4, 21.0, 8.95, DESK_HEIGHT, Color.WHITE_TABLE)),
  piece('tool cabinet', area(18.95, 4.25, 19.45, 5.25), [box(18.95, 4.25, 19.45, 5.25, 0, 0.95, Color.CABINET)]),
  piece('tool cabinet', area(20.3, 4.05, 20.85, 5.0), [box(20.3, 4.05, 20.85, 5.0, 0, 0.95, Color.CABINET)]),
  piece('stack of crates', area(12.95, 6.45, 13.55, 7.05), [
    box(12.95, 6.45, 13.55, 7.05, 0, 0.55, Color.CRATE),
    box(13.0, 6.5, 13.5, 7.0, 0.55, 1.05, Color.CRATE),
  ]),
  desk('desk (Fahmi)', 13.1, 9.2, 14.25, 9.95, [{ x: 13.68, z: 8.85, facing: Facing.SOUTH }]),
  desk('desk (Dion)', 14.35, 9.2, 15.5, 9.95, [{ x: 14.93, z: 8.85, facing: Facing.SOUTH }]),
  desk('desk (Lintang)', 15.6, 9.2, 16.75, 9.95, [{ x: 16.18, z: 8.85, facing: Facing.SOUTH }]),
  desk('desk (Faisal)', 16.85, 9.2, 18.0, 9.95, [{ x: 17.43, z: 8.85, facing: Facing.SOUTH }]),
  piece('wet lab sink', area(22.55, 0.5, 23.45, 0.95), [
    box(22.55, 0.5, 23.45, 0.95, 0, 0.88, Color.CABINET),
    box(22.55, 0.5, 23.45, 0.95, 0.88, 0.92, Color.SINK),
  ]),

  // Server room and toilet #4
  piece('server rack', area(3.35, 10.45, 4.0, 11.7), [box(3.35, 10.45, 4.0, 11.7, 0, 1.95, Color.SERVER)]),
  piece('server room cabinet', area(0.5, 9.5, 1.3, 9.9), [box(0.5, 9.5, 1.3, 9.9, 0, 1.0, Color.CABINET)]),
  piece('toilet', area(5.2, 10.3, 5.6, 10.98), [
    box(5.2, 10.3, 5.6, 10.78, 0, 0.42, Color.PORCELAIN),
    box(5.2, 10.78, 5.6, 10.98, 0.42, 0.8, Color.PORCELAIN),
  ]),

  // Praying room and ablution area
  piece('prayer rug', null, [box(1.0, 13.3, 2.2, 16.2, 0, 0.012, Color.RUG), box(2.05, 13.3, 2.2, 16.2, 0.012, 0.016, Color.RUG_TRIM)]),
  piece('prayer rug', null, [box(2.6, 13.5, 3.8, 16.4, 0, 0.012, Color.RUG), box(3.65, 13.5, 3.8, 16.4, 0.012, 0.016, Color.RUG_TRIM)]),
  piece('ablution bench', area(4.5, 12.0, 4.8, 15.0), [
    box(4.5, 12.0, 4.8, 15.0, 0, 0.55, Color.STONE),
    ...[12.5, 13.5, 14.5].map((z) => box(4.5, z - 0.04, 4.58, z + 0.04, 0.85, 0.93, Color.SINK)),
  ]),

  // Terrace
  piece('terrace steps', null, [11.1, 11.4, 11.7, 12.0, 12.35, 12.7].map((z) => box(6.5, z - 0.03, 12.6, z + 0.03, 0, 0.012, Color.STEP_EDGE))),
  piece('company sign', area(10.0, 9.6, 11.6, 9.72), [
    box(10.0, 9.6, 11.6, 9.72, 0.25, 0.8, Color.SIGN),
    box(10.1, 9.63, 10.16, 9.69, 0, 0.25, Color.POLE),
    box(11.44, 9.63, 11.5, 9.69, 0, 0.25, Color.POLE),
  ]),

  // East yard: toilet and security post
  piece('squat toilet', null, [box(20.55, 11.0, 21.0, 11.5, 0, 0.04, Color.PORCELAIN)]),
  desk('CCTV desk', 20.05, 12.55, 20.95, 13.1, [{ x: 20.5, z: 13.45, facing: Facing.NORTH }]),

  // Front yard
  piece('flag pole', area(9.4, 23.25, 9.8, 23.65), [
    box(9.4, 23.25, 9.8, 23.65, 0, 0.12, Color.STONE),
    box(9.56, 23.41, 9.64, 23.49, 0.12, 4.0, Color.POLE),
    box(9.64, 23.43, 10.4, 23.47, 3.4, 3.9, Color.FLAG),
  ]),
  palmTree(4.4, 24.25),
  palmTree(7.95, 23.7),
  palmTree(12.6, 22.5),
  piece('shrub', area(13.1, 11.0, 13.7, 11.6), [box(13.1, 11.0, 13.7, 11.6, 0, 0.7, Color.SHRUB)]),
  piece('shrub', area(14.1, 12.6, 14.7, 13.2), [box(14.1, 12.6, 14.7, 13.2, 0, 0.6, Color.SHRUB)]),
  piece('bollard', area(3.9, 20.6, 4.2, 20.9), [box(3.9, 20.6, 4.2, 20.9, 0, 0.9, Color.BOLLARD)]),
]);

/** @type {readonly Rect[]} */
export const OBSTACLES = deepFreeze(FURNITURE.map((piece) => piece.footprint).filter(Boolean));

/** @type {readonly Lantern[]} */
export const LANTERNS = deepFreeze([
  // On the uPulse desk
  { x: 5.98, y: DESK_HEIGHT, z: 1.0, facing: { x: 6.0, z: 5.0 } },
  // On the meeting table
  { x: 16.9, y: DESK_HEIGHT, z: 6.5, facing: { x: 16.5, z: 9.0 } },
  // At the top of the terrace steps
  { x: 12.2, y: 0, z: 10.3, facing: { x: 9.0, z: 16.0 } },
]);

/** @type {readonly GlowingFixture[]} */
export const GLOWING_FIXTURES = deepFreeze([
  {
    name: 'server lights',
    box: { x0: 3.3, z0: 10.6, x1: 3.35, z1: 11.55, y0: 0.3, y1: 1.75 },
    color: 0x3dffb0,
    light: { x: 2.9, y: 1.2, z: 11.1 },
  },
  {
    name: 'CCTV monitor',
    box: { x0: 20.25, z0: 12.58, x1: 20.75, z1: 12.68, y0: 0.78, y1: 1.12 },
    color: 0x9fc3ff,
    light: { x: 20.5, y: 1.0, z: 13.0 },
  },
  {
    name: 'neon sign',
    box: { x0: 8.3, z0: 23.85, x1: 9.7, z1: 24.0, y0: 1.0, y1: 1.5 },
    color: 0x2fd6ff,
    light: { x: 9.0, y: 1.3, z: 23.4 },
  },
]);

/** @type {readonly FloorPoint[]} Portraits hang on the north wall, facing into the office. */
export const PORTRAITS = deepFreeze([{ x: 2.4, z: 0.5 }, { x: 15.6, z: 0.5 }]);

/** @type {readonly CandySpot[]} Each round picks a few, at most two per room. `y` is the height it floats at. */
export const CANDY_SPOTS = deepFreeze([
  { room: 'office', x: 1.18, y: 0.84, z: 0.8 },
  { room: 'office', x: 1.42, y: 0.84, z: 7.6 },
  { room: 'office', x: 6.2, y: 0.08, z: 4.6 },
  { room: 'workshop', x: 15.9, y: 0.84, z: 3.65 },
  { room: 'workshop', x: 16.2, y: 0.84, z: 6.8 },
  { room: 'workshop', x: 17.4, y: 0.84, z: 9.55 },
  { room: 'wet lab', x: 22.95, y: 0.98, z: 0.72 },
  { room: 'stairwell', x: 20.8, y: 0.08, z: 1.0 },
  { room: 'server room', x: 2.5, y: 0.08, z: 11.2 },
  { room: 'toilet #4', x: 4.75, y: 0.08, z: 9.75 },
  { room: 'praying room', x: 1.6, y: 0.08, z: 14.8 },
  { room: 'ablution area', x: 4.65, y: 0.62, z: 13.5 },
  { room: 'terrace', x: 8.2, y: 0.08, z: 10.2 },
  { room: 'open area', x: 9.85, y: 0.3, z: 23.2 },
  { room: 'security post', x: 20.85, y: 0.84, z: 12.85 },
  { room: 'east toilet', x: 21.2, y: 0.08, z: 11.75 },
  { room: 'west parking', x: 1.5, y: 0.08, z: 22.0 },
  { room: 'guest parking', x: 19.0, y: 0.08, z: 18.5 },
]);

/** @type {readonly Point3[]} */
export const BATTERY_SPOTS = deepFreeze([
  { x: 6.5, y: 0.25, z: 5.6 },
  { x: 14.2, y: 0.25, z: 5.2 },
  { x: 1.2, y: 0.25, z: 11.8 },
  { x: 12.2, y: 0.25, z: 11.3 },
  { x: 17.5, y: 0.25, z: 15.6 },
  { x: 2.5, y: 0.25, z: 19.5 },
]);

/** @type {readonly FloorPoint[]} Where the ghost can appear and drift between. None are in the lobby, where you start. */
export const GHOST_SPOTS = deepFreeze([
  { x: 3.2, z: 4.8 },
  { x: 14.4, z: 4.9 },
  { x: 20.2, z: 7.9 },
  { x: 22.5, z: 3.2 },
  { x: 9.0, z: 14.5 },
  { x: 2.2, z: 15.3 },
  { x: 17.3, z: 16.0 },
  { x: 3.0, z: 22.0 },
  { x: 12.5, z: 20.5 },
]);
