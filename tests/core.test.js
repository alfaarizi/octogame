import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { EventBus } from '../src/core/EventBus.js';

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

  test('emitting an event nobody listens to does nothing', () => {
    assert.doesNotThrow(() => new EventBus().emit('nobody-home'));
  });
});
