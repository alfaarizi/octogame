/**
 * @file The office's ground floor. North half: the open-plan office (west), the lobby with the main staircase
 * (middle) and the workshop (east). South half: the yard, with the server room, toilets, praying room and
 * terrace along the building, and the main gate at the bottom right.
 */

import { Compass, deepFreeze } from '../../utils.js';
import {
  area,
  block,
  box,
  chairParts,
  Color,
  desk,
  deskParts,
  DESK_HEIGHT,
  flight,
  landing,
  piece,
  seat,
  stoolParts,
  STOREY_HEIGHT,
  table,
} from './floorKit.js';

function palmTree(x, z) {
  return piece('palm tree', area(x - 0.2, z - 0.2, x + 0.2, z + 0.2), [
    box(x - 0.12, z - 0.12, x + 0.12, z + 0.12, 0, 3.2, Color.PALM_TRUNK),
    box(x - 1.3, z - 0.22, x + 1.3, z + 0.22, 3.0, 3.07, Color.PALM_LEAF),
    box(x - 0.22, z - 1.3, x + 0.22, z + 1.3, 3.05, 3.12, Color.PALM_LEAF),
    box(x - 0.35, z - 0.35, x + 0.35, z + 0.35, 3.1, 3.35, Color.PALM_LEAF),
  ]);
}

/**
 * Tiles:
 *   # wall           F low wall or fence     E main gate (solid; you escape by reaching it once it unlocks)
 *   . office floor   ; wet-room tiles        _ covered parking      : stone paving     , garden paving
 *   S stairs         v stairs or a ramp down, out of the game
 *   (space) outside the grounds
 * @type {import('./floorKit.js').FloorLayout}
 */
export const GROUND_FLOOR = deepFreeze({
  tiles: [
    '################################################',
    '#............SSSSSSSSSSSS.................#....#',
    '#............SSSSSSSSSSSS.................#...##',
    '#................SSSS................###vv#...# ',
    '#................SSSS..................#vv#...# ',
    '#................SSSS..................#vv#...# ',
    '#................SSSS..................#vv#...# ',
    '#................SSSS..................####...# ',
    '#................SSSS........................## ',
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
  ],

  furniture: [
    // Office area
    desk('desk (Andri)', 0.55, 0.5, 1.8, 1.05, [{ x: 1.18, z: 1.35, facing: Compass.NORTH }]),
    desk('desk (Ihsan)', 1.8, 0.5, 3.05, 1.05, [{ x: 2.43, z: 1.35, facing: Compass.NORTH }]),
    desk('desk (spare)', 3.05, 0.5, 4.3, 1.05, [{ x: 3.68, z: 1.35, facing: Compass.NORTH }]),
    desk('desk (Ibrahim)', 4.3, 0.5, 5.55, 1.05, [{ x: 4.93, z: 1.35, facing: Compass.NORTH }]),
    desk('desk (uPulse)', 5.55, 0.5, 6.4, 1.5),
    desk('desk (Andrew)', 1.2, 2.7, 2.42, 3.55, [{ x: 1.81, z: 2.4, facing: Compass.SOUTH }]),
    desk('desk (Tempest)', 2.42, 2.7, 3.65, 3.55, [{ x: 3.03, z: 2.4, facing: Compass.SOUTH }]),
    desk('desk (spare, north)', 4.7, 2.7, 5.95, 3.5, [{ x: 5.33, z: 2.4, facing: Compass.SOUTH }]),
    desk('desk (spare, south)', 4.7, 3.5, 5.95, 4.35, [{ x: 5.33, z: 4.65, facing: Compass.NORTH }]),
    block('printer', 5.95, 3.1, 6.4, 3.55, 0.9, Color.PRINTER),
    desk('desk (Farib)', 1.0, 3.95, 1.85, 5.2, [{ x: 0.75, z: 4.55, facing: Compass.EAST }]),
    desk('desk (Dila)', 1.0, 5.2, 1.85, 6.45, [{ x: 0.75, z: 5.85, facing: Compass.EAST }]),
    desk('desk (Oji)', 1.0, 6.95, 1.85, 8.2, [{ x: 0.75, z: 7.55, facing: Compass.EAST }]),
    desk('desk (intern 1)', 2.8, 6.6, 4.05, 7.4, [{ x: 3.43, z: 6.3, facing: Compass.SOUTH }]),
    desk('desk (intern 2)', 4.05, 6.6, 5.3, 7.4, [{ x: 4.68, z: 6.3, facing: Compass.SOUTH }]),
    desk('desk (intern 3)', 5.3, 6.6, 6.55, 7.4, [{ x: 5.93, z: 6.3, facing: Compass.SOUTH }]),
    piece('desk (shared printer)', area(2.8, 7.4, 4.05, 8.25), [
      ...deskParts(2.8, 7.4, 4.05, 8.25),
      box(3.1, 7.55, 3.75, 8.1, DESK_HEIGHT, DESK_HEIGHT + 0.35, Color.PRINTER),
    ]),
    desk('desk (Adika)', 4.05, 7.4, 5.3, 8.25, [{ x: 4.68, z: 8.5, facing: Compass.NORTH }]),
    desk('desk (Elsa)', 5.3, 7.4, 6.55, 8.25, [{ x: 5.93, z: 8.5, facing: Compass.NORTH }]),
    desk('desk (Fast)', 11.95, 3.5, 12.75, 4.8, [{ x: 11.7, z: 4.15, facing: Compass.EAST }]),
    block('printer (Fast)', 12.3, 3.05, 12.75, 3.5, 0.9, Color.PRINTER),
    piece('desk (3D printing)', area(12.7, 0.5, 13.95, 1.05), [
      ...deskParts(12.7, 0.5, 13.95, 1.05),
      box(13.0, 0.6, 13.6, 1.0, DESK_HEIGHT, DESK_HEIGHT + 0.45, Color.PRINTER),
      ...chairParts(13.33, 1.35, Compass.NORTH),
    ]),

    // Lobby
    block('lobby partition', 6.9, 7.4, 7.2, 8.95, 1.8, Color.WHITE_FURNITURE),
    piece('first aid kit', null, [box(6.3, 8.85, 6.7, 9.0, 1.2, 1.55, Color.FIRST_AID)]),
    seat('armchair', 9.25, 6.65, 10.1, 7.5, Compass.NORTH, Color.WHITE_FURNITURE),
    seat('armchair', 9.55, 8.2, 10.35, 9.0, Compass.EAST, Color.WHITE_FURNITURE),
    block('bookshelf', 10.45, 6.55, 10.8, 8.95, 1.8, Color.SHELF),

    // Workshop
    desk('desk (Marvin)', 14.25, 0.5, 15.45, 1.05, [{ x: 14.85, z: 1.35, facing: Compass.NORTH }]),
    desk('desk (workshop intern)', 16.0, 0.5, 17.25, 1.05, [{ x: 16.63, z: 1.35, facing: Compass.NORTH }]),
    desk('desk (Tuwuh)', 12.75, 2.3, 14.0, 3.1, [{ x: 13.38, z: 2.0, facing: Compass.SOUTH }]),
    desk('desk (Nikko)', 12.75, 3.1, 14.0, 3.95, [{ x: 13.38, z: 4.25, facing: Compass.NORTH }]),
    desk('desk (Kafin)', 15.5, 3.05, 16.35, 4.3, [{ x: 16.6, z: 3.68, facing: Compass.WEST }]),
    desk('desk (Flo)', 16.4, 4.3, 17.65, 5.15),
    desk('desk (Bagas)', 17.65, 4.3, 18.9, 5.15, [{ x: 18.28, z: 4.0, facing: Compass.SOUTH }]),
    block('column', 18.6, 3.15, 19.05, 3.6, STOREY_HEIGHT, Color.PILLAR),
    piece('meeting table', area(14.95, 6.2, 17.5, 7.4), [
      ...table(14.95, 6.2, 17.5, 7.4, DESK_HEIGHT, Color.MEETING_TABLE),
      ...[15.6, 16.85].flatMap((x) => [5.95, 7.65].flatMap((z) => stoolParts(x, z, 0.48, Color.CHAIR))),
    ]),
    piece('rover track tables', area(18.1, 6.2, 20.6, 7.45), [
      ...table(18.1, 6.2, 19.35, 7.45, DESK_HEIGHT, Color.WHITE_TABLE),
      ...table(19.35, 6.2, 20.6, 7.45, DESK_HEIGHT, Color.WHITE_TABLE),
    ]),
    piece('workbench (east)', area(21.3, 6.0, 21.95, 8.4), [
      ...table(21.3, 6.0, 21.95, 8.4, DESK_HEIGHT, Color.WHITE_TABLE),
      ...chairParts(21.0, 6.5, Compass.EAST),
      ...chairParts(21.0, 7.8, Compass.EAST),
    ]),
    piece('workbench (south)', area(18.7, 8.35, 19.9, 8.95), table(18.7, 8.35, 19.9, 8.95, DESK_HEIGHT, Color.WHITE_TABLE)),
    piece('workbench (south)', area(20.0, 8.4, 21.0, 8.95), table(20.0, 8.4, 21.0, 8.95, DESK_HEIGHT, Color.WHITE_TABLE)),
    block('tool cabinet', 18.95, 4.25, 19.45, 5.25, 0.95, Color.CABINET),
    block('tool cabinet', 20.3, 4.05, 20.85, 5.0, 0.95, Color.CABINET),
    piece('stack of crates', area(12.95, 6.45, 13.55, 7.05), [
      box(12.95, 6.45, 13.55, 7.05, 0, 0.55, Color.CRATE),
      box(13.0, 6.5, 13.5, 7.0, 0.55, 1.05, Color.CRATE),
    ]),
    desk('desk (Fahmi)', 13.1, 9.2, 14.25, 9.95, [{ x: 13.68, z: 8.85, facing: Compass.SOUTH }]),
    desk('desk (Dion)', 14.35, 9.2, 15.5, 9.95, [{ x: 14.93, z: 8.85, facing: Compass.SOUTH }]),
    desk('desk (Lintang)', 15.6, 9.2, 16.75, 9.95, [{ x: 16.18, z: 8.85, facing: Compass.SOUTH }]),
    desk('desk (Faisal)', 16.85, 9.2, 18.0, 9.95, [{ x: 17.43, z: 8.85, facing: Compass.SOUTH }]),
    piece('wet lab sink', area(22.55, 0.5, 23.45, 0.95), [
      box(22.55, 0.5, 23.45, 0.95, 0, 0.88, Color.CABINET),
      box(22.55, 0.5, 23.45, 0.95, 0.88, 0.92, Color.SINK),
    ]),

    // Server room and toilet #4
    block('server rack', 3.35, 10.45, 4.0, 11.7, 1.95, Color.SERVER),
    block('server room cabinet', 0.5, 9.5, 1.3, 9.9, 1.0, Color.CABINET),
    seat('toilet', 5.2, 10.3, 5.6, 10.98, Compass.SOUTH, Color.PORCELAIN),

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
    desk('CCTV desk', 20.05, 12.55, 20.95, 13.1, [{ x: 20.5, z: 13.45, facing: Compass.NORTH }]),

    // Front yard
    piece('flag pole', area(9.4, 23.25, 9.8, 23.65), [
      box(9.4, 23.25, 9.8, 23.65, 0, 0.12, Color.STONE),
      box(9.56, 23.41, 9.64, 23.49, 0.12, 4.0, Color.POLE),
      box(9.64, 23.43, 10.4, 23.47, 3.4, 3.9, Color.FLAG),
    ]),
    palmTree(4.4, 24.25),
    palmTree(7.95, 23.7),
    palmTree(12.6, 22.5),
    block('shrub', 13.1, 11.0, 13.7, 11.6, 0.7, Color.SHRUB),
    block('shrub', 14.1, 12.6, 14.7, 13.2, 0.6, Color.SHRUB),
    block('bollard', 3.9, 20.6, 4.2, 20.9, 0.9, Color.BOLLARD),
  ],

  lanterns: [
    // On the uPulse desk
    { x: 5.98, y: DESK_HEIGHT, z: 1.0, facing: { x: 6.0, z: 5.0 } },
    // On the meeting table
    { x: 16.9, y: DESK_HEIGHT, z: 6.5, facing: { x: 16.5, z: 9.0 } },
    // At the top of the terrace steps
    { x: 12.2, y: 0, z: 10.3, facing: { x: 9.0, z: 16.0 } },
  ],

  fixtures: [
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
  ],

  portraits: [{ x: 2.4, z: 0.5 }, { x: 15.6, z: 0.5 }],

  candySpots: [
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
  ],

  batterySpots: [
    { x: 6.5, y: 0.25, z: 5.6 },
    { x: 14.2, y: 0.25, z: 5.2 },
    { x: 1.2, y: 0.25, z: 11.8 },
    { x: 12.2, y: 0.25, z: 11.3 },
    { x: 17.5, y: 0.25, z: 15.6 },
    { x: 2.5, y: 0.25, z: 19.5 },
  ],

  // None are in the lobby, where you start.
  ghostSpots: [
    { x: 3.2, z: 4.8 },
    { x: 14.4, z: 4.9 },
    { x: 20.2, z: 7.9 },
    { x: 22.5, z: 3.2 },
    { x: 9.0, z: 14.5 },
    { x: 2.2, z: 15.3 },
    { x: 17.3, z: 16.0 },
    { x: 3.0, z: 22.0 },
    { x: 12.5, z: 20.5 },
  ],

  // The main staircase: a flight up to a landing, then one flight either way up to the top floor.
  stairs: [
    flight(area(8.5, 1.5, 10.5, 4.5), Compass.NORTH, 0, STOREY_HEIGHT / 2, [Compass.WEST, Compass.EAST]),
    landing(area(8.5, 0.5, 10.5, 1.5), STOREY_HEIGHT / 2),
    flight(area(6.5, 0.5, 8.5, 1.5), Compass.WEST, STOREY_HEIGHT / 2, STOREY_HEIGHT, [Compass.SOUTH]),
    flight(area(10.5, 0.5, 12.5, 1.5), Compass.EAST, STOREY_HEIGHT / 2, STOREY_HEIGHT, [Compass.SOUTH]),
  ],
});
