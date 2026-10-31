import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONFIG } from '../src/config/gameConfig.js';
import { GameEvent } from '../src/core/GameEvent.js';
import { Flashlight } from '../src/models/player/Flashlight.js';
import { recordingEventBus } from './helpers.js';

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

  test('holds one brightness during a flicker instead of changing every frame', () => {
    const recorder = recordingEventBus();
    const samples = [0.5, 0.5, 0.2, 0.9];
    const light = new Flashlight(config, recorder.bus, () => samples.shift());
    light.update(0, 0, 1);
    const firstBrightness = light.brightness;
    light.update(0, 0.02, 1);
    assert.equal(light.brightness, firstBrightness);
    assert.equal(samples.length, 1);
  });
});
