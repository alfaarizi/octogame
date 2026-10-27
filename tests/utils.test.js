import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  Cooldown,
  deepFreeze,
  formatRoundTime,
  isWithinCone,
  ListenerSet,
  randomInRange,
  randomWalk,
  rotateToward,
  shuffled,
  weightedRandomItem,
  wrapAngle,
} from '../src/utils.js';

describe('math', () => {
  test('rotateToward turns the short way round', () => {
    const almostFull = Math.PI * 2 - 0.1;
    assert.ok(Math.abs(wrapAngle(rotateToward(0, almostFull, 1)) + 0.1) < 1e-9);
  });

  test('isWithinCone accepts targets ahead and rejects ones off to the side or too far', () => {
    const eye = { x: 1.5, y: 1.6, z: 1.5 };
    const east = { x: 1, y: 0, z: 0 };
    const halfAngle = 0.3;
    assert.equal(isWithinCone(eye, east, { x: 5, y: 1.6, z: 1.5 }, halfAngle, 10), true);
    assert.equal(isWithinCone(eye, east, { x: 1.5, y: 1.6, z: 5 }, halfAngle, 10), false);
    assert.equal(isWithinCone(eye, east, { x: 50, y: 1.6, z: 1.5 }, halfAngle, 10), false);
  });

  test('isWithinCone widens for big targets up close', () => {
    const eye = { x: 0, y: 0, z: 0 };
    const east = { x: 1, y: 0, z: 0 };
    const offToTheSide = { x: 1, y: 0, z: 0.5 };
    assert.equal(isWithinCone(eye, east, offToTheSide, 0.2, 10), false);
    assert.equal(isWithinCone(eye, east, offToTheSide, 0.2, 10, 0.4), true);
  });
});

describe('randomness', () => {
  test('randomInRange maps 0 and 1 to the ends of the range', () => {
    assert.equal(randomInRange({ min: 2, max: 6 }, () => 0), 2);
    assert.equal(randomInRange({ min: 2, max: 6 }, () => 1), 6);
  });

  test('weightedRandomItem never picks a zero-weight option', () => {
    for (let i = 0; i < 100; i++) {
      assert.equal(weightedRandomItem([{ value: 'never', weight: 0 }, { value: 'always', weight: 1 }]), 'always');
    }
  });

  test('shuffled returns a reordered copy and leaves the original alone', () => {
    const original = [1, 2, 3, 4, 5];
    const copy = shuffled(original);
    assert.deepEqual([...copy].sort(), original);
    assert.deepEqual(original, [1, 2, 3, 4, 5]);
  });

  test('randomWalk stays within its bounds', () => {
    const walk = randomWalk({ steps: 200, start: 100, min: 50, max: 220, maxStep: 40, upwardBias: 0.1 });
    assert.equal(walk.length, 200);
    assert.ok(walk.every((value) => value >= 50 && value <= 220));
  });
});

describe('deepFreeze', () => {
  test('freezes nested objects', () => {
    const frozen = deepFreeze({ a: { b: [1] } });
    assert.ok(Object.isFrozen(frozen.a.b));
  });
});

describe('formatRoundTime', () => {
  test('shows minutes, two-digit seconds and tenths', () => {
    assert.equal(formatRoundTime(0), '0:00.0');
    assert.equal(formatRoundTime(127.44), '2:07.4');
  });
});

describe('Cooldown', () => {
  test('reports ready once the time has passed', () => {
    const cooldown = new Cooldown(1);
    assert.equal(cooldown.tick(0.6), false);
    assert.equal(cooldown.tick(0.6), true);
    cooldown.restart(2);
    assert.equal(cooldown.tick(1), false);
  });
});

describe('ListenerSet', () => {
  test('notifies every listener with the arguments, and stops after removal', () => {
    const listeners = new ListenerSet();
    const received = [];
    const remove = listeners.add((a, b) => received.push(a + b));
    listeners.notify(1, 2);
    remove();
    listeners.notify(5, 5);
    assert.deepEqual(received, [3]);
  });
});
