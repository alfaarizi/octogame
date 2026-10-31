import { BrowserPointerLock } from '../controllers/input/BrowserPointerLock.js';
import { InputController } from '../controllers/input/InputController.js';
import { SimulatedPointerLock } from '../controllers/input/SimulatedPointerLock.js';
import { EventBus } from '../core/EventBus.js';
import { LocalJsonStore } from '../models/persistence/LocalJsonStore.js';
import { PreferencesRepository } from '../models/persistence/PreferencesRepository.js';
import { ScoreRepository } from '../models/persistence/ScoreRepository.js';
import { Simulation } from '../models/Simulation.js';
import { Building } from '../models/world/Building.js';
import { SpawnTable } from '../models/world/SpawnTable.js';
import { AudioDirector } from '../views/audio/AudioDirector.js';
import { AudioEngine } from '../views/audio/AudioEngine.js';
import { GhostView } from '../views/scene/hostiles/GhostView.js';
import { ExitDoorView } from '../views/scene/office/ExitDoorView.js';
import { OfficeLightingView } from '../views/scene/office/OfficeLightingView.js';
import { createOfficeModel } from '../views/scene/office/officeModel.js';
import { PickupView } from '../views/scene/pickups/PickupView.js';
import { FirstPersonView } from '../views/scene/player/FirstPersonView.js';
import { RenderContext } from '../views/scene/RenderContext.js';
import { Hud } from '../views/ui/hud/Hud.js';
import { HudDirector } from '../views/ui/hud/HudDirector.js';
import { ScreenEffects } from '../views/ui/hud/ScreenEffects.js';
import { PauseScreen } from '../views/ui/screens/PauseScreen.js';
import { ResultScreen } from '../views/ui/screens/ResultScreen.js';
import { TitleScreen } from '../views/ui/screens/TitleScreen.js';
import { PhotoAlbum } from '../views/ui/PhotoAlbum.js';
import { InvestigationView } from '../views/scene/investigation/InvestigationView.js';
import { PhotographyView } from '../views/scene/investigation/PhotographyView.js';

/** @typedef {import('../models/level/parseLevel.js').Level} Level */

/**
 * Builds every object the game needs and connects them: the models, the views that show them, and the
 * input and persistence the controllers use. This is the only place that knows the concrete classes;
 * everything else receives what it needs through its constructor.
 *
 * @param {object} options
 * @param {typeof import('../config/gameConfig.js').GAME_CONFIG} options.config
 * @param {Level} options.level - The building to play in, loaded from data/.
 * @param {boolean} options.isTestMode
 */
export function createGameContext({ config, level, isTestMode }) {
  const events = new EventBus();
  const building = new Building(level.floors, level.tileSize);
  const spawnTable = new SpawnTable(level);
  const simulation = new Simulation({ config, events, building, spawnTable, layout: level });
  const render = new RenderContext(document.body, config.rendering);
  const pointerLock = isTestMode ? new SimulatedPointerLock() : new BrowserPointerLock(render.canvas);
  const store = new LocalJsonStore();
  const ui = createUi({ config, events });

  return Object.freeze({
    config,
    level,
    events,
    simulation,
    render,
    views: createViews({ config, events, level, building, simulation, render, album: ui.album }),
    pointerLock,
    input: new InputController({ surface: render.canvas, pointerLock }),
    audio: new AudioDirector({ engine: new AudioEngine(config.audio), events, screamSamplePaths: config.audio.screamSamplePaths }),
    ui,
    persistence: Object.freeze({ scores: new ScoreRepository(store), preferences: new PreferencesRepository(store) }),
  });
}

function createViews({ config, events, level, building, simulation, render, album }) {
  render.scene.add(createOfficeModel(level, building.tileMaps));
  const firstPerson = new FirstPersonView(render.camera, {
    eyeHeight: config.player.eyeHeight,
    flashlight: config.flashlight,
    shadowMapSize: config.rendering.shadowMapSize,
  });
  return Object.freeze({
    firstPerson,
    investigation: new InvestigationView(render.scene, simulation.office, simulation.photography),
    photography: new PhotographyView(render, firstPerson, album),
    lighting: new OfficeLightingView(render.scene, events, {
      lanterns: level.lanterns,
      fixtures: level.fixtures,
      ceilingLights: level.ceilingLights,
      office: simulation.office,
      lanternIntensity: config.rendering.lanternIntensity,
      fixtureIntensity: config.rendering.fixtureIntensity,
    }),
    exitDoor: new ExitDoorView(render.scene, simulation.exitDoor, level.exitDoor, config.rendering.exitIntensity),
    ghost: new GhostView(render.scene, simulation.ghost, config.ghost),
    pickups: new PickupView(render.scene, simulation.pickups),
  });
}

function createUi({ config, events }) {
  const screenOptions = { evidenceRequired: config.round.evidenceRequired, leaderboardSize: config.ui.leaderboardSize };
  const effects = new ScreenEffects();
  return Object.freeze({
    album: new PhotoAlbum(),
    title: new TitleScreen(screenOptions),
    pause: new PauseScreen(),
    result: new ResultScreen({ ...screenOptions, inputDelay: config.ui.resultInputDelay }),
    effects,
    hud: new HudDirector(events, new Hud(), effects),
  });
}
