/**
 * Everything gameplay announces on the EventBus. Positions are floor-plan points: { x, z }.
 */
export const GameEvent = Object.freeze({
  // Payload: { candiesRequired }
  ROUND_STARTED: 'round-started',
  ROUND_ENDED: 'round-ended',
  GAME_PAUSED: 'game-paused',
  GAME_RESUMED: 'game-resumed',

  // Payload: { sprinting }
  PLAYER_STEPPED: 'player-stepped',
  PLAYER_CAUGHT: 'player-caught',
  PLAYER_ESCAPED: 'player-escaped',
  // Payload: { gentle, listenerPosition: { x, y, z } }
  JUMP_SCARE_STARTED: 'jump-scare-started',

  // Payload: { collected, required }
  CANDY_COLLECTED: 'candy-collected',
  // Payload: { position: { x, y, z } }
  CANDY_NEARBY: 'candy-nearby',
  BATTERY_COLLECTED: 'battery-collected',
  EXIT_UNLOCKED: 'exit-unlocked',

  // Payload: { on }
  FLASHLIGHT_TOGGLED: 'flashlight-toggled',
  FLASHLIGHT_TOGGLE_FAILED: 'flashlight-toggle-failed',
  FLASHLIGHT_FLICKERED: 'flashlight-flickered',
  FLASHLIGHT_LOW: 'flashlight-low',
  FLASHLIGHT_DEPLETED: 'flashlight-depleted',

  // Payload: { position }
  GHOST_WOKE: 'ghost-woke',
  // Payload: { position }
  GHOST_SPOTTED_PLAYER: 'ghost-spotted-player',
  // Payload: { position }
  GHOST_BANISHED: 'ghost-banished',
  GHOST_RESPAWNED: 'ghost-respawned',

  // Payload: { kind: AmbientNoiseKind, position: { x, y, z }, flickerLanterns }
  AMBIENT_NOISE: 'ambient-noise',
});
