import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseLevel } from '../src/models/level/parseLevel.js';
import { LevelFormatError } from '../src/models/level/validate.js';

/** A one-room building on two storeys, small enough to read at a glance. */
function sources({ building = {}, floor = {}, upstairs = {} } = {}) {
  const room = (overrides) => ({
    name: 'room',
    tiles: ['#####', '#...#', '#####'],
    furniture: {},
    lanterns: [],
    fixtures: [],
    portraits: [],
    candySpots: [],
    batterySpots: [],
    ghostSpots: [],
    stairs: [],
    ...overrides,
  });
  return {
    building: {
      name: 'test building',
      tileSize: 1,
      storeyHeight: 3,
      lowWallHeight: 1.5,
      palette: 'palette.json',
      floors: [{ storey: 0, file: 'ground.json' }, { storey: 1, file: 'upstairs.json' }],
      playerStart: { storey: 0, x: 2, z: 1.5, yaw: 0 },
      ghostStart: { storey: 1, x: 3, z: 1.5 },
      exitDoor: { centerX: 2, wallZ: 3, width: 1, height: 2, trigger: { minZ: 2, halfWidth: 0.5 } },
      ...building,
    },
    palette: { wood: '#5a3a24', desk: '#6b4226', deskFrame: '#2b2b2e', chair: '#303236' },
    floors: [room(floor), room(upstairs)],
  };
}

const withFurniture = (...pieces) => sources({ floor: { furniture: { 'the room': pieces } } });
const onlyPiece = (level) => level.floors[0].furniture[0];

describe('parseLevel', () => {
  test('places each floor at its storey and spawn points on their floors', () => {
    const level = parseLevel(sources({ upstairs: { batterySpots: [{ x: 2, y: 0.25, z: 1.5 }] } }));
    assert.deepEqual(level.floors.map((floor) => floor.elevation), [0, 3]);
    assert.deepEqual(level.playerStart, { x: 2, y: 0, z: 1.5, yaw: 0 });
    assert.deepEqual(level.ghostStart, { x: 3, y: 3, z: 1.5 });
    assert.deepEqual(level.batterySpots, [{ x: 2, y: 3.25, z: 1.5 }]);
  });

  test("a piece's footprint is the bounds of its solid parts, and chairs don't count", () => {
    const level = parseLevel(withFurniture({ name: 'desk', parts: [{ desk: [1, 1, 2, 1.5] }, { chair: { x: 1.5, z: 2 }, facing: 'north' }] }));
    assert.deepEqual(onlyPiece(level).footprint, { x0: 1, z0: 1, x1: 2, z1: 1.5 });
    assert.deepEqual(level.floors[0].obstacles, [{ x0: 1, z0: 1, x1: 2, z1: 1.5 }]);
  });

  test('"solid": false and "footprint" override the default', () => {
    const rug = { name: 'rug', solid: false, parts: [{ box: [1, 1, 3, 2, 0, 0.01], color: 'wood' }] };
    const flag = { name: 'flag', footprint: [1, 1, 1.2, 1.2], parts: [{ box: [1, 1, 2, 2, 0, 3], color: 'wood' }] };
    const [rugPiece, flagPiece] = parseLevel(withFurniture(rug, flag)).floors[0].furniture;
    assert.equal(rugPiece.footprint, null);
    assert.deepEqual(flagPiece.footprint, { x0: 1, z0: 1, x1: 1.2, z1: 1.2 });
  });

  test('colors come from the palette, or are given as "#rrggbb"', () => {
    const level = parseLevel(withFurniture({ name: 'crates', parts: [{ box: [1, 1, 2, 2, 0, 1], color: 'wood' }, { box: [1, 1, 2, 2, 1, 2], color: '#ff0000' }] }));
    assert.deepEqual(onlyPiece(level).parts.map((part) => part.color), [0x5a3a24, 0xff0000]);
  });

  test('furniture on an upper floor is lifted to its elevation', () => {
    const level = parseLevel(sources({ upstairs: { furniture: { room: [{ name: 'block', parts: [{ box: [1, 1, 2, 2, 0, 1], color: 'wood' }] }] } } }));
    assert.deepEqual(level.floors[1].furniture[0].parts[0], { x0: 1, z0: 1, x1: 2, z1: 2, y0: 3, y1: 4, color: 0x5a3a24 });
  });
});

describe('level format errors', () => {
  const rejects = (level, messagePart) =>
    assert.throws(() => parseLevel(level), (error) => error instanceof LevelFormatError && error.message.includes(messagePart));

  test('name the file and the place of the problem', () => {
    rejects(withFurniture({ name: 'desk', parts: [{ desk: [1, 1, 2] }] }), 'ground.json furniture.the room[0].parts[0].desk: expected [x0, z0, x1, z1]');
  });

  test('catch an unknown tile', () => {
    rejects(sources({ floor: { tiles: ['#####', '#.?.#', '#####'] } }), '"?" isn\'t a tile');
  });

  test('catch rows of different lengths', () => {
    rejects(sources({ floor: { tiles: ['#####', '#..#', '#####'] } }), 'is 4 tiles long');
  });

  test('catch an unknown color', () => {
    rejects(withFurniture({ name: 'block', parts: [{ box: [1, 1, 2, 2, 0, 1], color: 'mauve' }] }), 'found "mauve"');
  });

  test('catch a part that is no known kind', () => {
    rejects(withFurniture({ name: 'thing', parts: [{ sculpture: [1, 1, 2, 2] }] }), 'expected exactly one of');
  });

  test('catch a rectangle given back to front', () => {
    rejects(withFurniture({ name: 'block', parts: [{ box: [2, 1, 1, 2, 0, 1], color: 'wood' }] }), 'each lower bound must be less');
  });

  test('catch floors listed out of order', () => {
    rejects(sources({ building: { floors: [{ storey: 1, file: 'a.json' }, { storey: 0, file: 'b.json' }] } }), 'from the lowest storey up');
  });
});
