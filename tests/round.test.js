import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GameEvent } from '../src/core/GameEvent.js';
import { EXIT_DOOR } from '../src/data/houseLayout.js';
import { measureThreat } from '../src/gameplay/hostiles/threat.js';
import { PickupField, PickupKind } from '../src/gameplay/pickups/PickupField.js';
import { compareResults, rankResults } from '../src/gameplay/round/leaderboardRanking.js';
import { Round, RoundOutcome } from '../src/gameplay/round/Round.js';
import { ScoreRepository } from '../src/persistence/ScoreRepository.js';
import { ExitDoor } from '../src/world/ExitDoor.js';
import { recordingEventBus } from './helpers.js';

describe('Round', () => {
  test('opens the exit exactly once, when the last candy is collected', () => {
    const recorder = recordingEventBus();
    const exitDoor = new ExitDoor(EXIT_DOOR);
    const round = new Round({ events: recorder.bus, exitDoor, candiesRequired: 3 });
    round.start();
    round.recordCandy();
    round.recordCandy();
    assert.equal(exitDoor.isUnlocked, false);
    round.recordCandy();
    assert.equal(exitDoor.isUnlocked, true);
    round.recordCandy();
    assert.equal(recorder.count(GameEvent.EXIT_UNLOCKED), 1);
  });

  test('starting a new round relocks the door and resets the count', () => {
    const exitDoor = new ExitDoor(EXIT_DOOR);
    const round = new Round({ events: recordingEventBus().bus, exitDoor, candiesRequired: 1 });
    round.start();
    round.recordCandy();
    round.tick(12);
    round.start();
    assert.equal(exitDoor.isUnlocked, false);
    assert.equal(round.candiesCollected, 0);
    assert.equal(round.elapsed, 0);
  });

  test('summarizes the outcome', () => {
    const exitDoor = new ExitDoor(EXIT_DOOR);
    const round = new Round({ events: recordingEventBus().bus, exitDoor, candiesRequired: 5 });
    round.start();
    round.tick(42);
    const result = round.summarize('Sam', RoundOutcome.CAUGHT);
    assert.equal(result.playerName, 'Sam');
    assert.equal(result.escaped, false);
    assert.equal(result.timeSeconds, 42);
  });
});

describe('PickupField', () => {
  test('collects only what is within reach, once', () => {
    const field = new PickupField(1.2);
    field.populate({ candySpots: [{ x: 1, y: 0, z: 1 }, { x: 9, y: 0, z: 9 }], batterySpots: [{ x: 1.5, y: 0, z: 1 }] });
    const reached = field.collectWithinReach({ x: 1, z: 1 });
    assert.deepEqual(reached.map((item) => item.kind).sort(), [PickupKind.BATTERY, PickupKind.CANDY]);
    assert.equal(field.collectWithinReach({ x: 1, z: 1 }).length, 0);
    assert.equal(field.items.length, 1);
    assert.equal(field.nearest(PickupKind.CANDY, { x: 0, z: 0 }).item.position.x, 9);
  });
});

describe('leaderboard', () => {
  const escaped = (timeSeconds) => ({ escaped: true, timeSeconds, candiesCollected: 5 });
  const caught = (candiesCollected, timeSeconds) => ({ escaped: false, timeSeconds, candiesCollected });

  test('escapes rank above catches, fastest first; catches by candy, then survival time', () => {
    const ranked = rankResults([caught(4, 50), escaped(90), caught(4, 80), escaped(60), caught(5, 10)]);
    assert.deepEqual(ranked, [escaped(60), escaped(90), caught(5, 10), caught(4, 80), caught(4, 50)]);
    assert.equal(compareResults(escaped(1), escaped(1)), 0);
  });

  test('ScoreRepository saves results and reads them back ranked, in the stored format', () => {
    const memory = new Map();
    const store = { read: (key, fallback) => memory.get(key) ?? fallback, write: (key, value) => memory.set(key, value) };
    const scores = new ScoreRepository(store);
    scores.record({ playerName: 'A', escaped: false, timeSeconds: 30, candiesCollected: 2, finishedAt: 1 });
    const best = { playerName: 'B', escaped: true, timeSeconds: 99, candiesCollected: 5, finishedAt: 2 };
    const { rank } = scores.record(best);
    assert.equal(rank, 1);
    assert.deepEqual(memory.get('flashlight-haunt-scores')[0], { name: 'B', escaped: true, time: 99, candies: 5, at: 2 });
    assert.deepEqual(scores.loadRanked().map((result) => result.playerName), ['B', 'A']);
  });
});

describe('threat', () => {
  test('closeness and interference go from 0 far away to 1 at contact', () => {
    const settings = { heartbeatDistance: 10, flickerDistance: 6 };
    assert.deepEqual(measureThreat(20, settings), { closeness: 0, interference: 0 });
    assert.deepEqual(measureThreat(0, settings), { closeness: 1, interference: 1 });
    const atEightMeters = measureThreat(8, settings);
    assert.ok(Math.abs(atEightMeters.closeness - 0.2) < 1e-9);
    assert.equal(atEightMeters.interference, 0);
  });
});
