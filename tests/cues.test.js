import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONFIG } from '../src/config/gameConfig.js';
import { GameEvent } from '../src/core/GameEvent.js';
import { AmbientNoiseCue, AmbientNoiseKind } from '../src/gameplay/cues/AmbientNoiseCue.js';
import { CandyNearbyCue } from '../src/gameplay/cues/CandyNearbyCue.js';
import { FootstepCue } from '../src/gameplay/cues/FootstepCue.js';
import { recordingEventBus } from './helpers.js';

describe('FootstepCue', () => {
  const { footstepInterval, sprintFootstepRate } = GAME_CONFIG.player;

  test('steps at walking pace while moving, and never while standing still', () => {
    const recorder = recordingEventBus();
    const cue = new FootstepCue(recorder.bus, GAME_CONFIG.player);
    cue.update(10, { moving: false, sprinting: false });
    assert.equal(recorder.count(GameEvent.PLAYER_STEPPED), 0);
    for (let t = 0; t < footstepInterval * 4; t += 0.01) cue.update(0.01, { moving: true, sprinting: false });
    assert.ok(recorder.count(GameEvent.PLAYER_STEPPED) >= 4);
  });

  test('steps faster while sprinting', () => {
    const steps = (sprinting) => {
      const recorder = recordingEventBus();
      const cue = new FootstepCue(recorder.bus, { footstepInterval, sprintFootstepRate });
      for (let t = 0; t < 5; t += 0.01) cue.update(0.01, { moving: true, sprinting });
      return recorder.count(GameEvent.PLAYER_STEPPED);
    };
    assert.ok(steps(true) > steps(false));
  });
});

describe('CandyNearbyCue', () => {
  test('sparkles only when a candy is within range', () => {
    const recorder = recordingEventBus();
    const cue = new CandyNearbyCue(recorder.bus, GAME_CONFIG.round);
    const candy = { item: { position: { x: 1, y: 0.5, z: 1 } } };
    cue.update(1, { ...candy, distance: GAME_CONFIG.round.candySparkleRange + 1 });
    cue.update(1, null);
    assert.equal(recorder.count(GameEvent.CANDY_NEARBY), 0);
    cue.update(0.01, { ...candy, distance: 1 });
    assert.equal(recorder.count(GameEvent.CANDY_NEARBY), 1);
    assert.deepEqual(recorder.emitted[0].payload.position, candy.item.position);
  });
});

describe('AmbientNoiseCue', () => {
  test('makes one noise per interval, somewhere around the player', () => {
    const recorder = recordingEventBus();
    const cue = new AmbientNoiseCue(recorder.bus, GAME_CONFIG.round);
    cue.reset();
    const player = { x: 14, z: 9 };
    cue.update(GAME_CONFIG.round.ambientNoiseInterval.max + 0.1, player);
    assert.equal(recorder.count(GameEvent.AMBIENT_NOISE), 1);
    const { kind, position } = recorder.emitted[0].payload;
    assert.ok(Object.values(AmbientNoiseKind).includes(kind));
    const distance = Math.hypot(position.x - player.x, position.z - player.z);
    assert.ok(distance >= 5 && distance <= 11);
  });
});
