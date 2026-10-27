import { deepFreeze } from '../core/deepFreeze.js';

/**
 * Every value worth tweaking after a playtest.
 * Distances are meters (one map tile is 1 m), durations are seconds, angles are radians unless named otherwise.
 */
export const GAME_CONFIG = deepFreeze({
  round: {
    candiesRequired: 5,
    batteriesPlaced: 3,
    ghostGracePeriod: 15,
    ambientNoiseInterval: { min: 20, max: 40 },
    ambientNoiseLanternFlickerChance: 0.3,
    candySparkleRange: 3,
    candySparkleInterval: 1.4,
  },

  player: {
    walkSpeed: 3,
    sprintSpeed: 5,
    sprintDuration: 3,
    sprintRecharge: 4,
    windedRecoveryLevel: 0.3, // stamina needed before you can sprint again after running out
    collisionRadius: 0.3,
    eyeHeight: 1.6,
    mouseSensitivity: 0.0022, // radians per pixel
    keyboardTurnSpeed: 2.2, // radians per second
    maxPitch: 1.45,
    pickupRadius: 1.2,
    footstepInterval: 0.48,
    sprintFootstepRate: 1.6,
  },

  flashlight: {
    batteryLife: 60, // seconds of light from a full battery
    batteryPickupCharge: 0.4,
    lowBatteryLevel: 0.2,
    intensity: 45,
    range: 20,
    coneAngle: 0.45, // about 26°
    freezeAngleDegrees: 18,
    freezeRange: 10,
  },

  ghost: {
    wanderSpeed: 1,
    huntSpeed: 2,
    huntSpeedPerCandy: 0.2,
    enragedSpeed: 3.5,
    insideWallSpeedFactor: 0.5,
    banishExposure: 1.5, // seconds it has to stay in the beam
    respawnDelay: 6,
    enragedRespawnDelay: 2,
    senseRadius: 5, // notices you this close, light or not
    spotRadius: 12, // sees a lit flashlight from this far
    loseInterestDistance: 14,
    loseInterestTime: 5,
    arrivalDistance: 0.3,
    catchDistance: 0.9,
    flickerDistance: 6,
    heartbeatDistance: 10,
    bodyCenterHeight: 1.32,
    bodyRadius: 0.35,
    glow: 0.18,
  },

  jumpScare: {
    duration: 1.7,
    gentleDuration: 1.2,
    flashAt: 1.0,
    shakeAmount: 0.045,
    shakeFadeTime: 1.6,
  },

  rendering: {
    fieldOfView: 70,
    maxPixelRatio: 1.5,
    exposure: 1.15,
    fogDensity: 0.085,
    moonlightSkyColor: 0x7586b8,
    moonlightGroundColor: 0x0b0906,
    moonlightIntensity: 1.6, // what you can see with the flashlight off
    lanternIntensity: 1.6,
    fireIntensity: 2.5,
    exitIntensity: 4,
    shadowMapSize: 1024,
  },

  audio: {
    masterVolume: 0.8,
    // Drop a recording at one of these paths to replace the synthesized scream.
    screamSamplePaths: ['sounds/scream.mp3', 'sounds/scream.wav', 'sounds/scream.ogg'],
  },

  ui: {
    resultInputDelayMs: 1200, // so a panicked click after the jump scare doesn't skip the result
    leaderboardSize: 10,
  },
});
