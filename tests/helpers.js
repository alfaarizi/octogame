import { EventBus } from '../src/core/EventBus.js';
import { Building } from '../src/models/world/Building.js';

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

/** A building with one floor at height 0, made of 1 m tiles. */
export const singleFloorBuilding = (tiles, obstacles = []) => new Building([{ elevation: 0, tiles, obstacles, stairs: [] }], 1);
