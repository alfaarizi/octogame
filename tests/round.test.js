import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GameEvent } from '../src/core/GameEvent.js';
import { measureThreat } from '../src/models/hostiles/threat.js';
import { ScoreRepository } from '../src/models/persistence/ScoreRepository.js';
import { PickupField, PickupKind } from '../src/models/pickups/PickupField.js';
import { compareResults, rankResults } from '../src/models/round/leaderboardRanking.js';
import { Round, RoundOutcome } from '../src/models/round/Round.js';
import { ExitDoor } from '../src/models/world/ExitDoor.js';
import { recordingEventBus } from './helpers.js';
import { OFFICE } from './office.js';

describe('Round', () => {
  test('opens the exit exactly once, when the last evidence is collected', () => {
    const recorder = recordingEventBus();
    const exitDoor = new ExitDoor(OFFICE.exitDoor);
    const round = new Round({ events: recorder.bus, exitDoor, evidenceRequired: 3 });
    round.start();
    round.recordEvidence();
    round.recordEvidence();
    assert.equal(exitDoor.isUnlocked, false);
    round.recordEvidence();
    assert.equal(exitDoor.isUnlocked, true);
    round.recordEvidence();
    assert.equal(recorder.count(GameEvent.EXIT_UNLOCKED), 1);
  });

  test('starting a new round relocks the door and resets the count', () => {
    const exitDoor = new ExitDoor(OFFICE.exitDoor);
    const round = new Round({ events: recordingEventBus().bus, exitDoor, evidenceRequired: 1 });
    round.start();
    round.recordEvidence();
    round.tick(12);
    round.start();
    assert.equal(exitDoor.isUnlocked, false);
    assert.equal(round.evidenceCollected, 0);
    assert.equal(round.elapsed, 0);
  });

  test('summarizes the outcome', () => {
    const exitDoor = new ExitDoor(OFFICE.exitDoor);
    const round = new Round({ events: recordingEventBus().bus, exitDoor, evidenceRequired: 5 });
    round.start();
    round.tick(42);
    const result = round.summarize('Sam', RoundOutcome.CAUGHT);
    assert.equal(result.playerName, 'Sam');
    assert.equal(result.escaped, false);
    assert.equal(result.timeSeconds, 42);
  });
});

describe('PickupField', () => {
  test('explicit removal and re-addition preserve the dropped item identity', () => {
    const field = new PickupField();
    const item = field.add(PickupKind.FLASHLIGHT, { x: 1, y: .1, z: 1 });
    const snapshot = field.items;
    assert.equal(field.remove(item.id), item);
    assert.equal(field.remove(item.id), null);
    assert.equal(snapshot.length, 1);
    field.add(item.kind, { x: 2, y: .1, z: 2 }, item.id);
    assert.equal(field.items[0].id, item.id);
    assert.equal(field.items[0].position.x, 2);
  });
});

describe('leaderboard', () => {
  const escaped = (timeSeconds) => ({ escaped: true, timeSeconds, evidenceCollected: 5 });
  const caught = (evidenceCollected, timeSeconds) => ({ escaped: false, timeSeconds, evidenceCollected });

  test('escapes rank above catches, fastest first; catches by evidence, then survival time', () => {
    const ranked = rankResults([caught(4, 50), escaped(90), caught(4, 80), escaped(60), caught(5, 10)]);
    assert.deepEqual(ranked, [escaped(60), escaped(90), caught(5, 10), caught(4, 80), caught(4, 50)]);
    assert.equal(compareResults(escaped(1), escaped(1)), 0);
  });

  test('ScoreRepository saves results and reads them back ranked, in the stored format', () => {
    const memory = new Map();
    const store = { read: (key, fallback) => memory.get(key) ?? fallback, write: (key, value) => memory.set(key, value) };
    const scores = new ScoreRepository(store);
    scores.record({ playerName: 'A', escaped: false, timeSeconds: 30, evidenceCollected: 2, finishedAt: 1 });
    const best = { playerName: 'B', escaped: true, timeSeconds: 99, evidenceCollected: 5, finishedAt: 2 };
    const { rank } = scores.record(best);
    assert.equal(rank, 1);
    assert.deepEqual(memory.get('flashlight-haunt-investigation-scores-v2')[0], { name: 'B', escaped: true, time: 99, evidence: 5, at: 2 });
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
