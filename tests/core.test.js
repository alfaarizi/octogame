import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Cooldown } from '../src/core/Cooldown.js';
import { deepFreeze } from '../src/core/deepFreeze.js';
import { EventBus } from '../src/core/EventBus.js';
import { ListenerSet } from '../src/core/ListenerSet.js';
import { rotateToward, wrapAngle } from '../src/core/math.js';
import { randomInRange, shuffled, weightedRandomItem } from '../src/core/random.js';

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

describe('random', () => {
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
});

describe('EventBus', () => {
  test('delivers payloads to subscribers until they unsubscribe', () => {
    const bus = new EventBus();
    const received = [];
    const unsubscribe = bus.on('ping', ({ n }) => received.push(n));
    bus.emit('ping', { n: 1 });
    unsubscribe();
    bus.emit('ping', { n: 2 });
    assert.deepEqual(received, [1]);
  });

  test('a listener can unsubscribe itself mid-emit without skipping others', () => {
    const bus = new EventBus();
    const calls = [];
    const unsubscribe = bus.on('ping', () => {
      calls.push('first');
      unsubscribe();
    });
    bus.on('ping', () => calls.push('second'));
    bus.emit('ping');
    assert.deepEqual(calls, ['first', 'second']);
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

describe('math', () => {
  test('rotateToward turns the short way round', () => {
    const almostFull = Math.PI * 2 - 0.1;
    assert.ok(Math.abs(wrapAngle(rotateToward(0, almostFull, 1)) + 0.1) < 1e-9);
  });
});

describe('deepFreeze', () => {
  test('freezes nested objects', () => {
    const frozen = deepFreeze({ a: { b: [1] } });
    assert.ok(Object.isFrozen(frozen.a.b));
  });
});
