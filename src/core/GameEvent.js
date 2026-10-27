/**
 * Everything gameplay announces on the EventBus. Positions are floor-plan points: { x, z }.
 */
export const GameEvent = Object.freeze({
  ROUND_STARTED: 'round-started', // { candiesRequired }
  ROUND_ENDED: 'round-ended',
  GAME_PAUSED: 'game-paused',
  GAME_RESUMED: 'game-resumed',

  PLAYER_STEPPED: 'player-stepped', // { sprinting }
  PLAYER_CAUGHT: 'player-caught',
  PLAYER_ESCAPED: 'player-escaped',
  JUMP_SCARE_STARTED: 'jump-scare-started', // { gentle, listenerPosition: { x, y, z } }

  CANDY_COLLECTED: 'candy-collected', // { collected, required }
  CANDY_NEARBY: 'candy-nearby', // { position: { x, y, z } }
  BATTERY_COLLECTED: 'battery-collected',
  EXIT_UNLOCKED: 'exit-unlocked',

  FLASHLIGHT_TOGGLED: 'flashlight-toggled', // { on }
  FLASHLIGHT_TOGGLE_FAILED: 'flashlight-toggle-failed',
  FLASHLIGHT_FLICKERED: 'flashlight-flickered',
  FLASHLIGHT_LOW: 'flashlight-low',
  FLASHLIGHT_DEPLETED: 'flashlight-depleted',

  GHOST_WOKE: 'ghost-woke', // { position }
  GHOST_SPOTTED_PLAYER: 'ghost-spotted-player', // { position }
  GHOST_BANISHED: 'ghost-banished', // { position }
  GHOST_RESPAWNED: 'ghost-respawned',

  AMBIENT_NOISE: 'ambient-noise', // { kind: AmbientNoiseKind, position: { x, y, z }, flickerLanterns }
});
