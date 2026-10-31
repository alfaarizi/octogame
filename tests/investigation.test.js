import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONFIG } from '../src/config/gameConfig.js';
import { Inventory, ItemKind } from '../src/models/player/Inventory.js';
import { Photography } from '../src/models/investigation/Photography.js';
import { InteractionTargeting } from '../src/models/interaction/InteractionTargeting.js';
import { OfficeInteractions } from '../src/models/interaction/OfficeInteractions.js';
import { Building } from '../src/models/world/Building.js';
import { singleFloorBuilding, SMALL_ROOM } from './helpers.js';

const sight = { origin: { x: 2.5, y: 1.6, z: 3 }, direction: { x: 0, y: 0, z: -1 } };
const subject = { id: 'clock', name: 'Impossible clock', x: 2.5, y: 1.6, z: 1.5 };

describe('inventory', () => {
  test('has exactly two stable slots and preserves identity on drop and re-pickup', () => {
    const inventory = new Inventory();
    const torch = { id: 1, kind: ItemKind.FLASHLIGHT }, camera = { id: 2, kind: ItemKind.CAMERA };
    assert.equal(inventory.activeItem, null);
    assert.equal(inventory.pickUp(torch), true);
    assert.equal(inventory.pickUp(camera), true);
    assert.equal(inventory.pickUp({ id: 3, kind: ItemKind.BATTERY }), false);
    assert.equal(inventory.activeItem, torch);
    inventory.select(1);
    assert.equal(inventory.drop(), camera);
    assert.equal(inventory.activeItem, null);
    assert.deepEqual(inventory.slots, [torch, null]);
    inventory.pickUp(camera);
    assert.equal(inventory.activeItem, camera);
    inventory.reset();
    assert.deepEqual(inventory.slots, [null, null]);
  });
});

describe('photography', () => {
  const camera = (building = singleFloorBuilding(SMALL_ROOM)) => new Photography(GAME_CONFIG.camera, building, [subject]);
  test('scores distinct framed evidence once, supports ordinary photos, and enforces cooldown', () => {
    const photos = camera();
    assert.equal(photos.take(sight, 0).isNewEvidence, true);
    assert.equal(photos.take(sight, .5), null);
    assert.equal(photos.take(sight, 2).isNewEvidence, false);
    const blank = photos.take({ ...sight, direction: { x: 1, y: 0, z: 0 } }, 4);
    assert.equal(blank.subjectId, null);
    assert.equal(photos.photos.length, 3);
    photos.reset();
    assert.equal(photos.isDocumented(subject.id), false);
    assert.equal(photos.photos.length, 0);
  });
  test('rejects evidence behind walls, beyond range, off-center, or too close', () => {
    const photos = camera();
    assert.equal(photos.target({ origin: { x: 6.5, y: 1.6, z: 2.5 }, direction: { x: -1, y: 0, z: 0 } }), null);
    assert.equal(photos.target({ ...sight, origin: { x: 2.5, y: 1.6, z: 20 } }), null);
    assert.equal(photos.target({ ...sight, direction: { x: 1, y: 0, z: 0 } }), null);
    assert.equal(photos.target({ ...sight, origin: { x: 2.5, y: 1.6, z: 1.7 } }), null);
  });
  test('album is bounded and retains evidence when ordinary shots are evicted', () => {
    const photos = camera();
    photos.take(sight, 0);
    for (let i = 1; i < 50; i++) photos.take(sight, i * 2);
    assert.equal(photos.photos.length, GAME_CONFIG.camera.albumSize);
    assert.equal(photos.photos[0].isNewEvidence, true);
  });
});

describe('physical occlusion', () => {
  test('crosshair alignment takes priority over a closer object off to the side', () => {
    const targeting = new InteractionTargeting(singleFloorBuilding(SMALL_ROOM), GAME_CONFIG.interaction);
    const centered = { position: { x: 2.5, y: 1.6, z: 1.5 } };
    const offCenter = { position: { x: 2.8, y: 1.6, z: 2 } };
    assert.equal(targeting.find(sight, [offCenter, centered]), centered);
  });
  const box = { x0: 2, x1: 3, z0: 2, z1: 2.2, y0: 0, y1: 2.3 };
  const building = new Building([{ elevation: 0, tiles: SMALL_ROOM, obstacles: [box], stairs: [], furniture: [{ parts: [box] }] }], 1);
  test('a tall partition blocks photographs, interactions and ghost sight', () => {
    assert.equal(new Photography(GAME_CONFIG.camera, building, [subject]).target(sight), null);
    const targeting = new InteractionTargeting(building, GAME_CONFIG.interaction);
    assert.equal(targeting.find(sight, [{ position: subject }]), null);
    assert.equal(building.hasLineOfSight({ x: 2.5, y: 0, z: 3 }, { x: 2.5, y: 0, z: 1.5 }), false);
  });
  test('a drop stops before a wall and remains on the floor', () => {
    const drop = building.dropPosition({ x: 2.5, y: 0, z: 2.7 }, 0, .65, .3);
    assert.ok(drop.z >= 2.5 - 1e-9);
    assert.equal(drop.y, .12);
  });
  test('floor slabs prevent interacting with another storey', () => {
    const multistorey = new Building([0, 3].map(elevation => ({ elevation, tiles: SMALL_ROOM, stairs: [], obstacles: [] })), 1);
    assert.equal(multistorey.hasClearRay({ x: 2.5, y: 1.6, z: 3 }, { x: 2.5, y: 3.1, z: 3 }), false);
  });
});

describe('office interactions', () => {
  test('unseen hiding conceals, witnessed hiding does not, and leaving restores the entrance', () => {
    const office = new OfficeInteractions();
    const player = { position: { x: 2, y: 0, z: 3 }, yaw: 0, pitch: 0 };
    const original = { ...player.position };
    const closet = { id: 'closet', box: { x0: 1, x1: 2, y0: 0, z0: 1, z1: 2 } };
    office.enter(closet, player, false);
    assert.equal(office.isConcealed, true);
    assert.deepEqual(player.position, { x: 1.5, y: 0, z: 1.5 });
    office.leave(player);
    assert.deepEqual(player.position, original);
    office.enter(closet, player, true);
    assert.equal(office.isHidden, true);
    assert.equal(office.isConcealed, false);
    office.reset();
    assert.equal(office.isHidden, false);
  });
  test('a container provides supplies once per round', () => {
    const office = new OfficeInteractions();
    assert.equal(office.open('drawer'), true);
    assert.equal(office.open('drawer'), false);
    office.reset();
    assert.equal(office.open('drawer'), true);
  });
});
