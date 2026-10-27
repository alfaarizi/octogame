import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONFIG } from '../src/config/gameConfig.js';
import { Player } from '../src/gameplay/Player.js';

const noWalls = { resolveCircle() {} };
const intent = (overrides) => ({ forward: 0, strafe: 0, turn: 0, sprint: false, ...overrides });

describe('Player', () => {
  test('walks forward along -z at yaw 0, at walking speed', () => {
    const player = new Player(GAME_CONFIG.player, noWalls);
    player.respawn({ x: 0, z: 0, yaw: 0 });
    player.update(1, intent({ forward: 1 }));
    assert.ok(Math.abs(player.position.x) < 1e-9);
    assert.ok(Math.abs(player.position.z + GAME_CONFIG.player.walkSpeed) < 1e-9);
  });

  test('strafing right moves along +x at yaw 0', () => {
    const player = new Player(GAME_CONFIG.player, noWalls);
    player.respawn({ x: 0, z: 0, yaw: 0 });
    player.update(0.5, intent({ strafe: 1 }));
    assert.ok(player.position.x > 0);
  });

  test('sprint runs out, leaves you winded, and recovers', () => {
    const { sprintDuration, sprintRecharge, sprintSpeed, walkSpeed } = GAME_CONFIG.player;
    const player = new Player(GAME_CONFIG.player, noWalls);
    player.respawn({ x: 0, z: 0, yaw: 0 });

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

  test('looking up and down stops at the pitch limit', () => {
    const player = new Player(GAME_CONFIG.player, noWalls);
    player.look(0, -1e6);
    assert.equal(player.pitch, GAME_CONFIG.player.maxPitch);
  });
});
