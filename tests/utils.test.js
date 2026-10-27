import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  atHeight,
  Countdown,
  deepFreeze,
  easeToward,
  formatRoundTime,
  headingTo,
  isWithinCone,
  ListenerSet,
  pointAlongHeading,
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

  test('easeToward closes the given share of the gap, without overshooting', () => {
    assert.equal(easeToward(0, 10, 0.25), 2.5);
    assert.equal(easeToward(0, 10, 3), 10);
  });

  test('isWithinCone accepts targets ahead and rejects ones off to the side or too far', () => {
    const ray = { origin: { x: 1.5, y: 1.6, z: 1.5 }, direction: { x: 1, y: 0, z: 0 } };
    const cone = { halfAngle: 0.3, range: 10 };
    assert.equal(isWithinCone(ray, cone, { x: 5, y: 1.6, z: 1.5 }), true);
    assert.equal(isWithinCone(ray, cone, { x: 1.5, y: 1.6, z: 5 }), false);
    assert.equal(isWithinCone(ray, cone, { x: 50, y: 1.6, z: 1.5 }), false);
  });

  test('isWithinCone widens for big targets up close', () => {
    const ray = { origin: { x: 0, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } };
    const cone = { halfAngle: 0.2, range: 10 };
    const offToTheSide = { x: 1, y: 0, z: 0.5 };
    assert.equal(isWithinCone(ray, cone, offToTheSide), false);
    assert.equal(isWithinCone(ray, cone, offToTheSide, 0.4), true);
  });

  test('pointAlongHeading walks the way headingTo points', () => {
    const from = { x: 2, z: 3 };
    const to = pointAlongHeading(from, headingTo(from, { x: 5, z: 7 }), 5);
    assert.ok(Math.abs(to.x - 5) < 1e-9 && Math.abs(to.z - 7) < 1e-9);
    assert.deepEqual(atHeight(from, 1.5), { x: 2, y: 1.5, z: 3 });
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

describe('Countdown', () => {
  test('reports when the time has run out, and can be restarted', () => {
    const countdown = new Countdown(1);
    assert.equal(countdown.tick(0.6), false);
    assert.equal(countdown.tick(0.6), true);
    countdown.restart(2);
    assert.equal(countdown.tick(1), false);
    assert.equal(countdown.remaining, 1);
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
