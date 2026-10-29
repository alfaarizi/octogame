import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONFIG } from '../src/config/gameConfig.js';
import { Player } from '../src/models/player/Player.js';

const noWalls = {
  move(position, dx, dz) {
    position.x += dx;
    position.z += dz;
  },
};
const intent = (overrides) => ({ forward: 0, strafe: 0, turn: 0, sprint: false, ...overrides });

describe('Player', () => {
  test('walks forward along -z at yaw 0, at walking speed', () => {
    const player = new Player(GAME_CONFIG.player, noWalls);
    player.respawn({ x: 0, y: 0, z: 0, yaw: 0 });
    player.update(1, intent({ forward: 1 }));
    assert.ok(Math.abs(player.position.x) < 1e-9);
    assert.ok(Math.abs(player.position.z + GAME_CONFIG.player.walkSpeed) < 1e-9);
  });

  test('strafing right moves along +x at yaw 0', () => {
    const player = new Player(GAME_CONFIG.player, noWalls);
    player.respawn({ x: 0, y: 0, z: 0, yaw: 0 });
    player.update(0.5, intent({ strafe: 1 }));
    assert.ok(player.position.x > 0);
  });

  test('sprint runs out, leaves you winded, and recovers', () => {
    const { sprintDuration, sprintRecharge, sprintSpeed, walkSpeed } = GAME_CONFIG.player;
    const player = new Player(GAME_CONFIG.player, noWalls);
    player.respawn({ x: 0, y: 0, z: 0, yaw: 0 });

    assert.equal(player.update(0.1, intent({ forward: 1, sprint: true })).sprinting, true);
    player.update(sprintDuration, intent({ forward: 1, sprint: true }));
    assert.equal(player.stamina, 0);
    assert.equal(player.update(0.1, intent({ forward: 1, sprint: true })).sprinting, false, 'winded');

    player.update(sprintRecharge, intent({}));
    assert.equal(player.stamina, 1);
    const before = player.position.z;
    player.update(0.1, intent({ forward: 1, sprint: true }));
    assert.ok(Math.abs(before - player.position.z - sprintSpeed * 0.1) < 1e-9);
    assert.ok(sprintSpeed > walkSpeed);
  });

  test('sight starts at eye height above the feet and looks the way the player faces', () => {
    const player = new Player(GAME_CONFIG.player, noWalls);
    player.respawn({ x: 3, y: 3, z: 4, yaw: 0 });
    assert.deepEqual(player.sight.origin, { x: 3, y: 3 + GAME_CONFIG.player.eyeHeight, z: 4 });
    assert.ok(Math.abs(player.sight.direction.z + 1) < 1e-9, 'yaw 0 looks along -z');
    player.yaw = -Math.PI / 2;
    player.pitch = Math.PI / 6;
    const { direction } = player.sight;
    assert.ok(direction.x > 0.8 && Math.abs(direction.y - 0.5) < 1e-9, 'turned right and looking up');
    assert.ok(Math.abs(Math.hypot(direction.x, direction.y, direction.z) - 1) < 1e-9);
  });

  test('looking up and down stops at the pitch limit', () => {
    const player = new Player(GAME_CONFIG.player, noWalls);
    player.look(0, -1e6);
    assert.equal(player.pitch, GAME_CONFIG.player.maxPitch);
  });
});
