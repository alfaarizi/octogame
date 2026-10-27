/**
 * @file The office's top floor. North: meeting room #1, the opening over the lobby with the main staircase, and
 * the gym with the toilets beyond it. South: the kitchen and pantry, the lounge, toilet #1 and meeting room #2,
 * and the east balcony.
 */

import { Compass, deepFreeze } from '../../utils.js';
import { area, block, box, chairParts, Color, DESK_HEIGHT, piece, seat, SEAT_HEIGHT, stoolParts, table } from './floorKit.js';

const COUNTER_HEIGHT = 0.9;
const COUNTER_TOP = 0.04;
const BAR_STOOL_HEIGHT = 0.65;

/** A kitchen counter: a cabinet with a stone top. */
const counter = (name, x0, z0, x1, z1) =>
  piece(name, area(x0, z0, x1, z1), [
    box(x0, z0, x1, z1, 0, COUNTER_HEIGHT - COUNTER_TOP, Color.COUNTER),
    box(x0, z0, x1, z1, COUNTER_HEIGHT - COUNTER_TOP, COUNTER_HEIGHT, Color.COUNTER_TOP),
  ]);

/**
 * Tiles:
 *   # wall   . office floor   ; wet-room tiles   : balcony paving
 *   S stairs   * the opening over the lobby   (space) outside
 * @type {import('./floorKit.js').FloorLayout}
 */
export const TOP_FLOOR = deepFreeze({
  tiles: [
    '################################################',
    '#.........#..SSSSSSSSSSSS...............#;;#;;;#',
    '#.........#..SSSSSSSSSSSS...............#;;#;;##',
    '#.........#..****SSSS****...............#;;#;;# ',
    '#............****SSSS****...............#;;#;;# ',
    '#............************...............#;;;;;# ',
    '#.........#..************...............;;;;;;# ',
    '#.........#..************...............;;;;;;# ',
    '###########..************...............#;;;;## ',
    '#.......................................######  ',
    '#............................................#  ',
    '#.........................#..................#  ',
    '#.........................#..............#:::#  ',
    '#.........................#..............#:::#  ',
    '#.........................#..............#::##  ',
    '#.........................#..............#::#   ',
    '#####.....................#..............#::#   ',
    '#;;;#.....................#..............#::#   ',
    '#;;;######..#########.....#..........########   ',
    '#;;;;.......#       #.....#..........#          ',
    '#;;;;.......#       ##################          ',
    '#####.......#                                   ',
    '####........#                                   ',
    '####........#                                   ',
    '####........#                                   ',
    '#############                                   ',
  ],

  furniture: [
    // Meeting room #1: four tables facing the screen on the west wall
    ...[0.9, 2.7].flatMap((z0) =>
      [1.6, 3.3].map((x0) =>
        piece('training table', area(x0, z0, x0 + 0.6, z0 + 1.0), [
          ...table(x0, z0, x0 + 0.6, z0 + 1.0, DESK_HEIGHT, Color.WHITE_TABLE),
          ...chairParts(x0 + 0.9, z0 + 0.5, Compass.WEST),
        ]),
      ),
    ),
    piece('screen (meeting room #1)', null, [box(0.5, 1.3, 0.56, 2.9, 0.95, 1.85, Color.PRINTER)]),

    // Kitchen and pantry
    counter('kitchen counter (sink)', 0.5, 4.5, 1.1, 8.0),
    piece('sink', null, [box(0.6, 5.6, 1.0, 6.2, COUNTER_HEIGHT, COUNTER_HEIGHT + 0.02, Color.SINK)]),
    counter('kitchen counter (stove)', 1.1, 7.4, 2.45, 8.0),
    piece('gas stove', null, [box(1.3, 7.5, 2.0, 7.95, COUNTER_HEIGHT, COUNTER_HEIGHT + 0.06, Color.GYM)]),
    block('refrigerator', 2.5, 7.45, 3.15, 8.1, 1.8, Color.APPLIANCE),
    block('water dispenser', 2.6, 8.15, 3.05, 8.55, 1.25, Color.APPLIANCE),
    counter('kitchen cabinet', 2.5, 8.6, 3.15, 9.0),
    piece('pantry table', area(4.0, 6.4, 4.9, 8.3), [
      ...table(4.0, 6.4, 4.9, 8.3, COUNTER_HEIGHT, Color.WOOD),
      ...stoolParts(5.2, 6.9, BAR_STOOL_HEIGHT, Color.CUSHION),
      ...stoolParts(5.2, 7.8, BAR_STOOL_HEIGHT, Color.CUSHION),
    ]),
    piece('dining table', area(6.2, 6.65, 9.9, 7.5), [
      ...table(6.2, 6.65, 8.05, 7.5, DESK_HEIGHT, Color.WOOD),
      ...table(8.05, 6.65, 9.9, 7.5, DESK_HEIGHT, Color.WOOD),
      ...[8.25, 8.85, 9.45].flatMap((x) => [...stoolParts(x, 6.3, 0.45, Color.CHAIR), ...stoolParts(x, 7.85, 0.45, Color.CHAIR)]),
    ]),

    // Lounge
    seat('sofa', 10.55, 5.55, 11.85, 6.3, Compass.NORTH, Color.SOFA),
    seat('sofa', 12.1, 6.7, 12.95, 8.55, Compass.EAST, Color.SOFA),
    piece('poufs', null, [...stoolParts(12.25, 5.85, SEAT_HEIGHT, Color.CUSHION), ...stoolParts(12.65, 6.35, SEAT_HEIGHT, Color.CUSHION)]),
    block('coffee table', 10.8, 6.9, 11.6, 8.2, 0.45, Color.WOOD),
    block('daybed', 10.95, 8.7, 12.75, 9.95, SEAT_HEIGHT, Color.SOFA),
    block('lounge cabinet', 10.5, 8.7, 10.9, 9.95, 1.0, Color.WOOD),

    // Gym
    block('folding partition', 13.25, 2.8, 13.4, 4.4, 2.2, Color.PARTITION),
    piece('ping pong table', area(16.05, 2.65, 17.65, 5.5), [
      ...table(16.05, 2.65, 17.65, 5.5, DESK_HEIGHT, Color.PING_PONG),
      box(16.05, 4.05, 17.65, 4.1, DESK_HEIGHT, DESK_HEIGHT + 0.15, Color.WHITE_FURNITURE),
    ]),
    piece('treadmill', area(18.75, 6.05, 20.35, 6.8), [
      box(18.75, 6.1, 20.2, 6.75, 0, 0.2, Color.GYM),
      box(20.2, 6.05, 20.35, 6.8, 0, 1.3, Color.GYM),
      box(19.6, 6.05, 20.3, 6.1, 0.9, 0.95, Color.POLE),
      box(19.6, 6.75, 20.3, 6.8, 0.9, 0.95, Color.POLE),
    ]),
    piece('multi-gym', area(18.8, 7.1, 20.4, 8.9), [
      ...[18.8, 20.32].flatMap((x) => [7.1, 8.82].map((z) => box(x, z, x + 0.08, z + 0.08, 0, 2.1, Color.GYM))),
      box(18.8, 7.1, 20.4, 7.18, 2.02, 2.1, Color.GYM),
      box(18.8, 8.82, 20.4, 8.9, 2.02, 2.1, Color.GYM),
      box(19.3, 7.5, 19.9, 8.5, 0, 0.45, Color.CUSHION),
    ]),
    block('weight bench', 15.0, 9.0, 16.6, 9.35, 0.45, Color.CUSHION),
    block('dumbbell rack', 16.9, 8.7, 17.9, 9.6, 0.9, Color.GYM),

    // Toilets and washroom
    piece('squat toilet', null, [box(20.75, 0.8, 21.25, 1.4, 0, 0.04, Color.PORCELAIN)]),
    seat('toilet', 22.3, 0.5, 22.7, 1.18, Compass.NORTH, Color.PORCELAIN),
    piece('washbowls', area(20.7, 4.0, 22.2, 4.5), [
      box(20.7, 4.0, 22.2, 4.5, 0, 0.81, Color.CABINET),
      box(20.7, 4.0, 22.2, 4.5, 0.81, 0.85, Color.SINK),
    ]),
    seat('toilet', 0.5, 9.4, 1.18, 9.8, Compass.WEST, Color.PORCELAIN),
    piece('shower tray', null, [box(0.5, 8.5, 1.3, 9.2, 0, 0.04, Color.PORCELAIN)]),
    block('washbowl (toilet #1)', 0.5, 10.0, 0.95, 10.45, 0.85, Color.SINK),

    // Meeting room #2
    piece('meeting table', area(2.7, 11.25, 5.3, 11.8), [
      ...table(2.7, 11.25, 5.3, 11.8, DESK_HEIGHT, Color.MEETING_TABLE),
      ...[3.1, 4.0, 4.9].flatMap((x) => [...chairParts(x, 10.95, Compass.SOUTH), ...chairParts(x, 12.1, Compass.NORTH)]),
    ]),
    piece('screen (meeting room #2)', null, [box(2.0, 11.1, 2.06, 12.2, 0.95, 1.7, Color.PRINTER)]),

    // East balcony
    block('planter', 21.0, 6.6, 21.3, 7.2, 0.6, Color.PLANTER),
    block('planter', 21.0, 8.4, 21.3, 9.0, 0.6, Color.PLANTER),
  ],

  lanterns: [
    // On the dining table, facing the stairs
    { x: 9.2, y: DESK_HEIGHT, z: 7.05, facing: { x: 9.5, z: 3.0 } },
  ],

  fixtures: [
    {
      name: 'screen showing static',
      box: { x0: 0.56, z0: 1.4, x1: 0.58, z1: 2.8, y0: 1.0, y1: 1.8 },
      color: 0xb8d4ff,
      light: { x: 1.1, y: 1.4, z: 2.1 },
    },
  ],

  portraits: [{ x: 3.0, z: 0.5 }, { x: 18.5, z: 0.5 }],

  candySpots: [
    { room: 'meeting room #1', x: 1.9, y: 0.84, z: 1.4 },
    { room: 'meeting room #1', x: 4.6, y: 0.08, z: 3.7 },
    { room: 'kitchen', x: 0.8, y: 0.98, z: 6.4 },
    { room: 'kitchen', x: 2.2, y: 0.98, z: 7.7 },
    { room: 'pantry', x: 4.45, y: 0.98, z: 7.3 },
    { room: 'pantry', x: 6.6, y: 0.84, z: 7.1 },
    { room: 'lounge', x: 11.2, y: 0.53, z: 7.5 },
    { room: 'gym', x: 16.85, y: 0.84, z: 3.3 },
    { room: 'gym', x: 14.2, y: 0.08, z: 9.6 },
    { room: 'washroom', x: 21.5, y: 0.93, z: 4.25 },
    { room: 'toilet #2', x: 21.0, y: 0.08, z: 1.75 },
    { room: 'toilet #1', x: 1.6, y: 0.08, z: 9.0 },
    { room: 'meeting room #2', x: 4.0, y: 0.84, z: 11.5 },
    { room: 'east balcony', x: 21.4, y: 0.08, z: 7.6 },
  ],

  batterySpots: [
    { x: 5.9, y: 0.25, z: 4.0 },
    { x: 13.9, y: 0.25, z: 6.2 },
    { x: 3.0, y: 0.25, z: 10.0 },
  ],

  ghostSpots: [
    { x: 3.0, z: 2.5 },
    { x: 7.5, z: 8.3 },
    { x: 15.0, z: 7.0 },
    { x: 22.0, z: 3.5 },
    { x: 4.0, z: 12.2 },
  ],

  stairs: [],
});
