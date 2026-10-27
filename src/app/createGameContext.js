import { AudioDirector } from '../audio/AudioDirector.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { EventBus } from '../core/EventBus.js';
import {
  BATTERY_SPOTS,
  CANDY_SPOTS,
  EXIT_DOOR,
  FURNITURE,
  GHOST_SPOTS,
  GHOST_START,
  GLOWING_FIXTURES,
  LANTERNS,
  LOW_WALL_HEIGHT,
  OBSTACLES,
  PLAYER_START,
  PORTRAITS,
  TILE_ROWS,
  TILE_SIZE,
  WALL_HEIGHT,
} from '../data/officeLayout.js';
import { Simulation } from '../gameplay/Simulation.js';
import { BrowserPointerLock } from '../input/BrowserPointerLock.js';
import { InputController } from '../input/InputController.js';
import { SimulatedPointerLock } from '../input/SimulatedPointerLock.js';
import { LocalJsonStore } from '../persistence/LocalJsonStore.js';
import { PreferencesRepository } from '../persistence/PreferencesRepository.js';
import { ScoreRepository } from '../persistence/ScoreRepository.js';
import { GhostView } from '../rendering/hostiles/GhostView.js';
import { ExitDoorView } from '../rendering/office/ExitDoorView.js';
import { OfficeLightingView } from '../rendering/office/OfficeLightingView.js';
import { createOfficeModel } from '../rendering/office/officeModel.js';
import { PickupView } from '../rendering/pickups/PickupView.js';
import { FirstPersonView } from '../rendering/player/FirstPersonView.js';
import { RenderContext } from '../rendering/RenderContext.js';
import { Hud } from '../ui/hud/Hud.js';
import { HudDirector } from '../ui/hud/HudDirector.js';
import { ScreenEffects } from '../ui/hud/ScreenEffects.js';
import { PauseScreen } from '../ui/screens/PauseScreen.js';
import { ResultScreen } from '../ui/screens/ResultScreen.js';
import { TitleScreen } from '../ui/screens/TitleScreen.js';
import { deepFreeze } from '../utils.js';
import { SpawnTable } from '../world/SpawnTable.js';
import { TileMap } from '../world/TileMap.js';

/**
 * Builds every object the game needs and connects them. This is the only place that knows
 * the concrete classes; everything else receives what it needs through its constructor.
 *
 * @param {{ config: typeof import('../config/gameConfig.js').GAME_CONFIG, isTestMode: boolean }} options
 */
export function createGameContext({ config, isTestMode }) {
  const events = new EventBus();
  const tileMap = new TileMap(TILE_ROWS, TILE_SIZE);
  const layout = deepFreeze({ playerStart: PLAYER_START, ghostStart: GHOST_START, exitDoor: EXIT_DOOR, obstacles: OBSTACLES });
  const spawnTable = new SpawnTable({ candySpots: CANDY_SPOTS, batterySpots: BATTERY_SPOTS, ghostSpots: GHOST_SPOTS });
  const simulation = new Simulation({ config, events, tileMap, spawnTable, layout });
  const render = new RenderContext(document.body, config.rendering);
  const pointerLock = isTestMode ? new SimulatedPointerLock() : new BrowserPointerLock(render.canvas);
  const store = new LocalJsonStore();

  return Object.freeze({
    config,
    layout,
    events,
    simulation,
    render,
    views: createViews({ config, events, tileMap, simulation, render }),
    pointerLock,
    input: new InputController({ surface: render.canvas, pointerLock }),
    audio: new AudioDirector({ engine: new AudioEngine(config.audio), events, screamSamplePaths: config.audio.screamSamplePaths }),
    ui: createUi({ config, events }),
    persistence: Object.freeze({ scores: new ScoreRepository(store), preferences: new PreferencesRepository(store) }),
  });
}

function createViews({ config, events, tileMap, simulation, render }) {
  render.scene.add(
    createOfficeModel(tileMap, { furniture: FURNITURE, portraits: PORTRAITS, wallHeight: WALL_HEIGHT, lowWallHeight: LOW_WALL_HEIGHT }),
  );
  return Object.freeze({
    firstPerson: new FirstPersonView(render.camera, {
      eyeHeight: config.player.eyeHeight,
      flashlight: config.flashlight,
      shadowMapSize: config.rendering.shadowMapSize,
    }),
    lighting: new OfficeLightingView(render.scene, events, {
      lanterns: LANTERNS,
      fixtures: GLOWING_FIXTURES,
      lanternIntensity: config.rendering.lanternIntensity,
      fixtureIntensity: config.rendering.fixtureIntensity,
    }),
    exitDoor: new ExitDoorView(render.scene, simulation.exitDoor, EXIT_DOOR, config.rendering.exitIntensity),
    ghost: new GhostView(render.scene, simulation.ghost, config.ghost),
    pickups: new PickupView(render.scene, simulation.pickups, config.flashlight.beamCone),
  });
}

function createUi({ config, events }) {
  const screenOptions = { candiesRequired: config.round.candiesRequired, leaderboardSize: config.ui.leaderboardSize };
  const effects = new ScreenEffects();
  return Object.freeze({
    title: new TitleScreen(screenOptions),
    pause: new PauseScreen(),
    result: new ResultScreen({ ...screenOptions, inputDelay: config.ui.resultInputDelay }),
    effects,
    hud: new HudDirector(events, new Hud(), effects),
  });
}
