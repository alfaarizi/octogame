import { deepFreeze } from '../utils.js';

/*
 * The haunted house as data: the tile grid, furniture, and every spawn point.
 * World meters; tile column = x, tile row = z.
 * Top row of rooms: bedroom, bathroom, study. Middle: the hallway. Bottom: kitchen, foyer, living room.
 */

export const WALL_HEIGHT = 2.8;

/** # wall, . floor, E front door (solid; you escape by reaching it once it unlocks). */
export const TILE_ROWS = deepFreeze([
  '############################',
  '#........#........#........#',
  '#........#........#........#',
  '#.................#........#',
  '#.................#........#',
  '#........#........#........#',
  '#........#........#........#',
  '####..#######..#######..####',
  '#..........................#',
  '#..........................#',
  '#..........................#',
  '####..#######..#######..####',
  '#........#........#........#',
  '#........#........#........#',
  '#........#.................#',
  '#........#.................#',
  '#........#........#........#',
  '#........#........#........#',
  '#############EE#############',
]);

export const PLAYER_START = deepFreeze({ x: 14, z: 16.6, yaw: 0 });
export const GHOST_START = deepFreeze({ x: 23, z: 4.5 });

export const EXIT_DOOR = deepFreeze({
  centerX: 14,
  // Inner face of the south wall
  wallZ: 18,
  width: 2,
  height: 2.4,
  trigger: { minZ: 16.9, halfWidth: 1.3 },
});

const Color = deepFreeze({
  WOOD: 0x4a3322,
  DARK_WOOD: 0x2b1d13,
  PORCELAIN: 0xd2d2ca,
  BLANKET: 0x4a3b55,
  LINEN: 0xbdb5a5,
  BRASS: 0x8a7a50,
  BATH_WATER: 0x1b2629,
  CABINET: 0x6e6356,
  BOOKS_RED: 0x5a2222,
  BOOKS_BLUE: 0x24384a,
  BOOKS_GREEN: 0x3d4a24,
  BOOKS_BROWN: 0x4a3a22,
  VELVET: 0x4a1f2c,
  CLOCK_FACE: 0xcfc6a6,
  COUNTER: 0x4f3b2c,
  COUNTERTOP: 0x8f8f88,
  FRIDGE: 0xb7bbb5,
  SOFA: 0x33264a,
  SOFA_ARM: 0x2b2040,
  STONE: 0x4a443c,
  SOOT: 0x050302,
  HEARTH: 0x3a3530,
  FOYER_RUG: 0x4a1a1a,
  LIVING_RUG: 0x1f2a3a,
});

/** A box spanning x0–x1, z0–z1 on the floor plan and y0–y1 in height. */
const box = (x0, z0, x1, z1, y0, y1, color) => ({ x0, z0, x1, z1, y0, y1, color });

/** A floor-plan rectangle: what the player bumps into. */
const area = (x0, z0, x1, z1) => ({ x0, z0, x1, z1 });

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

/** Each piece: a name, its `footprint` (null for flat things like rugs) and the boxes it's drawn with. */
export const FURNITURE = deepFreeze([
  // Bedroom
  { name: 'bed', footprint: area(1.1, 1.0, 3.5, 3.6), parts: [
    box(1.1, 1.0, 3.5, 3.6, 0, 0.42, Color.DARK_WOOD),
    box(1.15, 1.55, 3.45, 3.55, 0.42, 0.56, Color.BLANKET),
    box(1.35, 1.15, 3.25, 1.55, 0.42, 0.6, Color.LINEN),
    box(1.1, 1.0, 3.5, 1.12, 0, 1.15, Color.DARK_WOOD),
  ] },
  { name: 'nightstand', footprint: area(3.7, 1.0, 4.3, 1.6), parts: [box(3.7, 1.0, 4.3, 1.6, 0, 0.6, Color.WOOD)] },
  { name: 'wardrobe', footprint: area(7.6, 1.0, 8.95, 2.5), parts: [
    box(7.6, 1.0, 8.95, 2.5, 0, 2.0, Color.DARK_WOOD),
    box(7.58, 1.74, 7.6, 1.76, 0.9, 1.2, Color.BRASS),
  ] },

  // Bathroom
  { name: 'bathtub', footprint: area(10.1, 1.1, 12.0, 3.9), parts: [
    box(10.1, 1.1, 12.0, 3.9, 0, 0.6, Color.PORCELAIN),
    box(10.25, 1.25, 11.85, 3.75, 0.6, 0.61, Color.BATH_WATER),
  ] },
  { name: 'sink', footprint: area(15.4, 1.0, 17.0, 1.6), parts: [
    box(15.4, 1.0, 17.0, 1.6, 0, 0.85, Color.CABINET),
    box(15.45, 1.02, 16.95, 1.58, 0.85, 0.92, Color.PORCELAIN),
  ] },
  { name: 'toilet', footprint: area(17.25, 3.0, 17.95, 3.7), parts: [
    box(17.3, 3.05, 17.9, 3.65, 0, 0.42, Color.PORCELAIN),
    box(17.7, 3.0, 17.95, 3.7, 0.42, 0.9, Color.PORCELAIN),
  ] },

  // Study
  { name: 'desk', footprint: area(21.8, 1.0, 24.6, 2.0), parts: table(21.8, 1.0, 24.6, 2.0, 0.8, Color.WOOD) },
  { name: 'bookshelf', footprint: area(26.4, 1.4, 26.95, 6.6), parts: [
    box(26.4, 1.4, 26.95, 6.6, 0, 2.2, Color.DARK_WOOD),
    box(26.36, 1.5, 26.4, 6.5, 0.35, 0.65, Color.BOOKS_RED),
    box(26.36, 1.5, 26.4, 6.5, 0.85, 1.15, Color.BOOKS_BLUE),
    box(26.36, 1.5, 26.4, 6.5, 1.35, 1.65, Color.BOOKS_GREEN),
    box(26.36, 1.5, 26.4, 6.5, 1.85, 2.1, Color.BOOKS_BROWN),
  ] },
  { name: 'armchair', footprint: area(19.6, 3.8, 20.8, 5.0), parts: [
    box(19.6, 3.8, 20.8, 5.0, 0, 0.5, Color.VELVET),
    box(19.6, 3.8, 19.85, 5.0, 0.5, 1.1, Color.VELVET),
    box(19.6, 3.8, 20.8, 4.0, 0.5, 0.7, Color.VELVET),
    box(19.6, 4.8, 20.8, 5.0, 0.5, 0.7, Color.VELVET),
  ] },

  // Hallway
  { name: 'hall table', footprint: area(8.0, 8.05, 9.0, 8.55), parts: table(8.0, 8.05, 9.0, 8.55, 0.85, Color.WOOD) },
  { name: 'grandfather clock', footprint: area(17.1, 8.0, 17.7, 8.45), parts: [
    box(17.1, 8.0, 17.7, 8.45, 0, 2.1, Color.DARK_WOOD),
    box(17.2, 8.45, 17.6, 8.47, 1.55, 1.95, Color.CLOCK_FACE),
  ] },

  // Kitchen
  { name: 'counter', footprint: area(1.0, 12.4, 1.75, 17.6), parts: [
    box(1.0, 12.4, 1.7, 17.6, 0, 0.9, Color.COUNTER),
    box(1.0, 12.4, 1.75, 17.6, 0.9, 0.96, Color.COUNTERTOP),
  ] },
  { name: 'kitchen table', footprint: area(4.0, 14.0, 6.6, 16.0), parts: table(4.0, 14.0, 6.6, 16.0, 0.78, Color.WOOD) },
  { name: 'west chair', footprint: area(3.4, 14.6, 3.9, 15.4), parts: [
    box(3.4, 14.6, 3.9, 15.4, 0, 0.45, Color.DARK_WOOD),
    box(3.4, 14.6, 3.5, 15.4, 0.45, 1.0, Color.DARK_WOOD),
  ] },
  { name: 'east chair', footprint: area(6.7, 14.6, 7.2, 15.4), parts: [
    box(6.7, 14.6, 7.2, 15.4, 0, 0.45, Color.DARK_WOOD),
    box(7.1, 14.6, 7.2, 15.4, 0.45, 1.0, Color.DARK_WOOD),
  ] },
  { name: 'fridge', footprint: area(7.9, 17.1, 8.95, 17.95), parts: [box(7.9, 17.1, 8.95, 17.95, 0, 1.9, Color.FRIDGE)] },

  // Foyer
  { name: 'bench', footprint: area(10.1, 13.0, 10.6, 15.0), parts: [box(10.1, 13.0, 10.6, 15.0, 0, 0.45, Color.WOOD)] },
  { name: 'side table', footprint: area(16.9, 12.1, 17.9, 12.8), parts: table(16.9, 12.1, 17.9, 12.8, 0.85, Color.WOOD) },
  { name: 'coat rack', footprint: area(17.3, 16.8, 17.7, 17.2), parts: [
    box(17.45, 16.95, 17.55, 17.05, 0, 1.8, Color.DARK_WOOD),
    box(17.3, 16.8, 17.7, 17.2, 0, 0.04, Color.DARK_WOOD),
  ] },
  { name: 'foyer rug', footprint: null, parts: [box(11.8, 13.4, 16.2, 17.2, 0, 0.012, Color.FOYER_RUG)] },

  // Living room
  { name: 'sofa', footprint: area(21.0, 16.8, 25.0, 17.95), parts: [
    box(21.0, 16.8, 25.0, 17.95, 0, 0.45, Color.SOFA),
    box(21.0, 17.6, 25.0, 17.95, 0.45, 0.95, Color.SOFA),
    box(21.0, 16.8, 21.3, 17.95, 0.45, 0.65, Color.SOFA_ARM),
    box(24.7, 16.8, 25.0, 17.95, 0.45, 0.65, Color.SOFA_ARM),
  ] },
  { name: 'coffee table', footprint: area(22.2, 14.6, 23.8, 15.5), parts: table(22.2, 14.6, 23.8, 15.5, 0.45, Color.WOOD) },
  { name: 'fireplace', footprint: area(25.9, 13.3, 26.95, 15.7), parts: [
    box(26.3, 13.4, 26.95, 15.6, 0, 1.2, Color.STONE),
    box(26.2, 13.3, 26.95, 15.7, 1.2, 1.3, Color.DARK_WOOD),
    box(26.28, 14.0, 26.3, 15.0, 0.05, 0.75, Color.SOOT),
    box(25.9, 13.6, 26.3, 15.4, 0, 0.05, Color.HEARTH),
  ] },
  { name: 'living room rug', footprint: null, parts: [box(20.5, 13.2, 25.5, 16.4, 0, 0.012, Color.LIVING_RUG)] },
]);

export const FIREPLACE = deepFreeze({
  embers: { x: 26.2, y: 0.11, z: 14.5, width: 0.16, height: 0.12, depth: 0.7 },
  light: { x: 25.85, y: 0.45, z: 14.5 },
});

/** Jack-o'-lanterns: where each sits, and the point its carved face turns toward. */
export const LANTERNS = deepFreeze([
  // Foyer side table
  { x: 17.4, y: 0.85, z: 12.45, facing: { x: 14, z: 15 } },
  // Kitchen counter
  { x: 1.35, y: 0.96, z: 16.6, facing: { x: 5, z: 15 } },
  // Hall table
  { x: 8.5, y: 0.85, z: 8.3, facing: { x: 8.5, z: 10 } },
]);

/** Portraits hang on south-facing wall faces at these points. */
export const PORTRAITS = deepFreeze([{ x: 11, z: 8.0 }, { x: 20.5, z: 8.0 }, { x: 11.5, z: 12.0 }]);

/** Candy hiding spots; each round picks a few, at most two per room. `y` is the height it floats at. */
export const CANDY_SPOTS = deepFreeze([
  { room: 'bedroom', x: 3.1, y: 0.64, z: 2.8 },
  { room: 'bedroom', x: 4.0, y: 0.68, z: 1.3 },
  { room: 'bedroom', x: 5.5, y: 0.08, z: 6.5 },
  { room: 'bathroom', x: 11.05, y: 0.69, z: 3.5 },
  { room: 'bathroom', x: 16.2, y: 1.0, z: 1.3 },
  { room: 'study', x: 23.0, y: 0.88, z: 1.5 },
  { room: 'study', x: 20.3, y: 0.58, z: 4.4 },
  { room: 'hallway', x: 26.3, y: 0.08, z: 10.4 },
  { room: 'hallway', x: 1.5, y: 0.08, z: 10.4 },
  { room: 'kitchen', x: 1.35, y: 1.04, z: 13.2 },
  { room: 'kitchen', x: 5.6, y: 0.86, z: 14.3 },
  { room: 'living room', x: 21.8, y: 0.53, z: 17.1 },
  { room: 'living room', x: 23.0, y: 0.53, z: 15.05 },
  { room: 'living room', x: 26.55, y: 1.38, z: 14.0 },
]);

export const BATTERY_SPOTS = deepFreeze([
  { x: 7.0, y: 0.25, z: 17.3 },
  { x: 6.5, y: 0.25, z: 5.5 },
  { x: 9.5, y: 0.25, z: 10.3 },
  { x: 24.5, y: 0.25, z: 5.8 },
  { x: 14.5, y: 0.25, z: 5.8 },
  { x: 20.0, y: 0.25, z: 13.0 },
]);

/** Where the ghost can appear and drift between. None are in the foyer, where you start. */
export const GHOST_SPOTS = deepFreeze([
  { x: 5, z: 4.5 },
  { x: 14, z: 4 },
  { x: 23, z: 4.5 },
  { x: 2.5, z: 9.5 },
  { x: 25.5, z: 9.5 },
  { x: 5, z: 16.8 },
  { x: 23, z: 13 },
]);
