import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONFIG } from '../src/config/gameConfig.js';
import { GameEvent } from '../src/core/GameEvent.js';
import { Flashlight } from '../src/gameplay/Flashlight.js';
import { FlashlightBeam, isWithinCone } from '../src/gameplay/FlashlightBeam.js';
import { TileMap } from '../src/world/TileMap.js';
import { recordingEventBus, SMALL_ROOM } from './helpers.js';

const config = GAME_CONFIG.flashlight;

describe('Flashlight', () => {
  test('drains while on, warns once when low, and switches off when empty', () => {
    const recorder = recordingEventBus();
    const light = new Flashlight(config, recorder.bus, () => 0.5);
    for (let t = 0; t < config.batteryLife + 1; t += 0.5) light.update(0.5, t, 0);
    assert.equal(light.charge, 0);
    assert.equal(light.isOn, false);
    assert.equal(light.brightness, 0);
    assert.equal(recorder.count(GameEvent.FLASHLIGHT_LOW), 1);
    assert.equal(recorder.count(GameEvent.FLASHLIGHT_DEPLETED), 1);
  });

  test("doesn't drain while off", () => {
    const light = new Flashlight(config, recordingEventBus().bus);
    light.toggle();
    light.update(30, 30, 0);
    assert.equal(light.charge, 1);
  });

  test("can't be switched on when empty", () => {
    const recorder = recordingEventBus();
    const light = new Flashlight(config, recorder.bus);
    light.update(config.batteryLife, 0, 0);
    light.toggle();
    assert.equal(light.isOn, false);
    assert.equal(recorder.count(GameEvent.FLASHLIGHT_TOGGLE_FAILED), 1);
  });

  test('recharging never goes above full', () => {
    const light = new Flashlight(config, recordingEventBus().bus);
    light.update(config.batteryLife / 2, 0, 0);
    light.recharge(10);
    assert.equal(light.charge, 1);
  });

  test('flickers when the ghost interferes', () => {
    const recorder = recordingEventBus();
    const light = new Flashlight(config, recorder.bus, () => 0);
    light.update(0.01, 0, 1);
    assert.equal(recorder.count(GameEvent.FLASHLIGHT_FLICKERED), 1);
    assert.ok(light.brightness < 1);
  });
});

describe('FlashlightBeam', () => {
  const eye = { x: 1.5, y: 1.6, z: 1.5 };
  const east = { x: 1, y: 0, z: 0 };

  test('the cone test accepts targets ahead and rejects ones off to the side or too far', () => {
    const halfAngle = 0.3;
    assert.equal(isWithinCone(eye, east, { x: 5, y: 1.6, z: 1.5 }, halfAngle, 10), true);
    assert.equal(isWithinCone(eye, east, { x: 1.5, y: 1.6, z: 5 }, halfAngle, 10), false);
    assert.equal(isWithinCone(eye, east, { x: 50, y: 1.6, z: 1.5 }, halfAngle, 10), false);
  });

  test("walls block the beam even when the target's in the cone", () => {
    const beam = new FlashlightBeam(new TileMap(SMALL_ROOM), config);
    assert.equal(beam.illuminates(eye, east, { x: 6.5, y: 1.3, z: 1.5 }, 0.35), true);
    assert.equal(beam.illuminates({ ...eye, z: 2.5 }, east, { x: 6.5, y: 1.3, z: 2.5 }, 0.35), false);
  });
});
