/**
 * @file The office's basement: a workshop under the north-east of the building, with the CNC machines, a few desks
 * and a storage room. Stairs lead up to the ground floor's workshop, and out to the front yard.
 */

import { Compass, deepFreeze } from '../../utils.js';
import { area, block, box, Color, desk, DESK_HEIGHT, flight, piece, stoolParts, STOREY_HEIGHT, table } from './floorKit.js';

/** A CNC machine: a cabinet with its spindle carriage on top. */
const cncMachine = (name, x0, z0, x1, z1) =>
  piece(name, area(x0, z0, x1, z1), [
    box(x0, z0, x1, z1, 0, 1.0, Color.APPLIANCE),
    box(x0 + 0.1, z0 + 0.1, x1 - 0.1, z1 - 0.1, 1.0, 1.05, Color.GYM),
    box(x0 + 0.05, z0 + 0.45, x1 - 0.05, z0 + 0.6, 1.05, 1.5, Color.GYM),
  ]);

/**
 * Tiles:
 *   # wall   . floor   S stairs   (space) solid ground
 * @type {import('./floorKit.js').FloorLayout}
 */
export const BASEMENT = deepFreeze({
  tiles: [
    '                                                ',
    '                                                ',
    '                                       ######   ',
    '                          ##############SS###   ',
    '                          #............#SS###   ',
    '                          #............#SS###   ',
    '                          #............#SS###   ',
    '                          #............#SS###   ',
    '                          #............#SS###   ',
    '                          #............#SS###   ',
    '                          #................#    ',
    '                          #................#    ',
    '                          #...............##    ',
    '                          #.......#########     ',
    '                          #.......#.......#     ',
    '                          #.......#.......#     ',
    '                          #.......#.......#     ',
    '                          #.......#.......#     ',
    '                          #####...#..######     ',
    '                              #SSSSSS#          ',
    '                              #SSSSSS#          ',
    '                              #SSSSSS#          ',
    '                              #SSSSSS#          ',
    '                              #SSSSSS#          ',
    '                              #SSSSSS#          ',
    '                              #SSSSSS#          ',
    '                              #SSSSSS#          ',
    '                              ########          ',
  ],

  furniture: [
    cncMachine('CNC machine (old)', 13.55, 2.05, 14.75, 3.3),
    cncMachine('CNC machine (new)', 15.0, 2.05, 16.2, 3.3),
    desk('desk (Ajeng)', 16.4, 2.0, 17.6, 2.6, [{ x: 17.0, z: 2.9, facing: Compass.NORTH }]),
    desk('desk (Ferry)', 17.6, 2.0, 18.8, 2.6, [{ x: 18.2, z: 2.9, facing: Compass.NORTH }]),
    block('column', 18.8, 3.15, 19.25, 3.6, STOREY_HEIGHT, Color.PILLAR),
    desk('desk (Rafidal)', 17.9, 3.95, 18.6, 5.0, [{ x: 17.6, z: 4.45, facing: Compass.EAST }]),
    piece('work table', area(14.3, 3.9, 15.4, 6.2), [
      ...table(14.3, 3.9, 15.4, 6.2, DESK_HEIGHT, Color.WOOD),
      ...[14.0, 15.7].flatMap((x) => [4.4, 5.6].flatMap((z) => stoolParts(x, z, 0.48, Color.CHAIR))),
    ]),
    piece('workbench', area(18.0, 5.95, 20.9, 6.5), table(18.0, 5.95, 20.9, 6.5, DESK_HEIGHT, Color.WOOD)),
    piece('table', area(14.3, 7.4, 15.5, 8.2), table(14.3, 7.4, 15.5, 8.2, DESK_HEIGHT, Color.WOOD)),
    block('bench', 13.5, 8.55, 15.4, 9.0, 0.45, Color.CABINET),
    block('tall cabinet', 16.6, 6.6, 17.0, 8.4, 1.8, Color.CABINET),

    // Storage room
    block('storage shelves', 17.6, 7.0, 20.7, 7.4, 1.9, Color.SHELF),
    piece('stack of crates', area(20.2, 8.3, 20.8, 8.9), [
      box(20.2, 8.3, 20.8, 8.9, 0, 0.55, Color.CRATE),
      box(20.25, 8.35, 20.75, 8.85, 0.55, 1.05, Color.CRATE),
    ]),
  ],

  lanterns: [
    // On the work table, facing the stairs from the front yard
    { x: 14.85, y: DESK_HEIGHT, z: 5.6, facing: { x: 16.2, z: 9.0 } },
  ],

  fixtures: [
    {
      name: 'CNC control panel',
      box: { x0: 16.2, z0: 2.35, x1: 16.23, z1: 2.85, y0: 0.6, y1: 0.95 },
      color: 0xffa040,
      light: { x: 16.6, y: 0.9, z: 2.6 },
    },
  ],

  portraits: [],

  candySpots: [
    { room: 'CNC corner', x: 14.15, y: 1.58, z: 2.7 },
    { room: 'CNC corner', x: 16.6, y: 0.08, z: 3.5 },
    { room: 'basement desks', x: 17.0, y: 0.84, z: 2.3 },
    { room: 'basement desks', x: 18.25, y: 0.84, z: 4.5 },
    { room: 'basement workshop', x: 14.85, y: 0.84, z: 4.4 },
    { room: 'basement workshop', x: 14.9, y: 0.84, z: 7.8 },
    { room: 'storage room', x: 19.2, y: 0.08, z: 8.6 },
    { room: 'storage room', x: 20.5, y: 1.13, z: 8.6 },
  ],

  batterySpots: [
    { x: 13.8, y: 0.25, z: 6.8 },
    { x: 20.6, y: 0.25, z: 5.5 },
    { x: 18.0, y: 0.25, z: 8.6 },
  ],

  ghostSpots: [
    { x: 15.9, z: 3.8 },
    { x: 16.0, z: 7.6 },
    { x: 19.6, z: 8.2 },
    { x: 20.6, z: 5.4 },
  ],

  stairs: [
    // Up to the ground floor's workshop, and up to the front yard.
    flight(area(20.0, 1.5, 21.0, 5.0), Compass.NORTH, 0, STOREY_HEIGHT),
    flight(area(15.5, 9.5, 18.5, 13.5), Compass.SOUTH, 0, STOREY_HEIGHT, [Compass.EAST]),
  ],
});
