import { EventBus } from '../src/core/EventBus.js';

/** An EventBus that also remembers every event emitted, for assertions. */
export function recordingEventBus() {
  const bus = new EventBus();
  const emitted = [];
  const emit = bus.emit.bind(bus);
  bus.emit = (type, payload = {}) => {
    emitted.push({ type, payload });
    emit(type, payload);
  };
  return {
    bus,
    emitted,
    types: () => emitted.map((event) => event.type),
    count: (type) => emitted.filter((event) => event.type === type).length,
  };
}

/**
 * A small walled room with one interior wall:
 *
 *   #########
 *   #.......#
 *   #...#...#
 *   #.......#
 *   ####E####
 */
export const SMALL_ROOM = Object.freeze(['#########', '#.......#', '#...#...#', '#.......#', '####E####']);
