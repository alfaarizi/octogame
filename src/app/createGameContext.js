import { AudioDirector } from '../audio/AudioDirector.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { EventBus } from '../core/EventBus.js';
import {
  BATTERY_SPOTS,
  CANDY_SPOTS,
  EXIT_DOOR,
  FIREPLACE,
  FURNITURE,
  GHOST_SPOTS,
  GHOST_START,
  LANTERNS,
  PLAYER_START,
  PORTRAITS,
  TILE_ROWS,
  WALL_HEIGHT,
} from '../data/houseLayout.js';
import { AmbientNoiseCue } from '../gameplay/cues/AmbientNoiseCue.js';
import { CandyNearbyCue } from '../gameplay/cues/CandyNearbyCue.js';
import { Flashlight } from '../gameplay/player/Flashlight.js';
import { FlashlightBeam } from '../gameplay/player/FlashlightBeam.js';
import { FootstepCue } from '../gameplay/cues/FootstepCue.js';
import { Ghost } from '../gameplay/hostiles/Ghost.js';
import { PickupField } from '../gameplay/pickups/PickupField.js';
import { Player } from '../gameplay/player/Player.js';
import { Round } from '../gameplay/round/Round.js';
import { InputController } from '../input/InputController.js';
import { BrowserPointerLock } from '../input/BrowserPointerLock.js';
import { SimulatedPointerLock } from '../input/SimulatedPointerLock.js';
import { LocalJsonStore } from '../persistence/LocalJsonStore.js';
import { PreferencesRepository } from '../persistence/PreferencesRepository.js';
import { ScoreRepository } from '../persistence/ScoreRepository.js';
import { ExitDoorView } from '../rendering/house/ExitDoorView.js';
import { FirstPersonView } from '../rendering/player/FirstPersonView.js';
import { GhostView } from '../rendering/hostiles/GhostView.js';
import { HouseLightingView } from '../rendering/house/HouseLightingView.js';
import { HouseView } from '../rendering/house/HouseView.js';
import { PickupView } from '../rendering/pickups/PickupView.js';
import { RenderContext } from '../rendering/RenderContext.js';
import { Hud } from '../ui/hud/Hud.js';
import { HudDirector } from '../ui/hud/HudDirector.js';
import { PauseScreen } from '../ui/screens/PauseScreen.js';
import { ResultScreen } from '../ui/screens/ResultScreen.js';
import { ScreenEffects } from '../ui/hud/ScreenEffects.js';
import { TitleScreen } from '../ui/screens/TitleScreen.js';
import { CollisionWorld } from '../world/CollisionWorld.js';
import { ExitDoor } from '../world/ExitDoor.js';
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
  const tileMap = new TileMap(TILE_ROWS);
  const spawnTable = new SpawnTable({ candySpots: CANDY_SPOTS, batterySpots: BATTERY_SPOTS, ghostSpots: GHOST_SPOTS });
  const world = createWorld({ config, events, tileMap, spawnTable });
  const render = new RenderContext(document.body, config.rendering);
  const views = createViews({ config, events, tileMap, world, render });
  const pointerLock = isTestMode ? new SimulatedPointerLock() : new BrowserPointerLock(render.canvas);
  const store = new LocalJsonStore();

  return Object.freeze({
    config,
    layout: Object.freeze({ playerStart: PLAYER_START, ghostStart: GHOST_START }),
    events,
    spawnTable,
    world,
    render,
    views,
    pointerLock,
    input: new InputController({ surface: render.canvas, pointerLock }),
    audio: new AudioDirector({ engine: new AudioEngine(config.audio), events, screamSamplePaths: config.audio.screamSamplePaths }),
    ui: createUi({ config, events }),
    persistence: Object.freeze({ scores: new ScoreRepository(store), preferences: new PreferencesRepository(store) }),
  });
}

/** The simulation: plain objects with no knowledge of rendering, audio or the page. */
function createWorld({ config, events, tileMap, spawnTable }) {
  const obstacles = FURNITURE.map((piece) => piece.footprint).filter(Boolean);
  const exitDoor = new ExitDoor(EXIT_DOOR);
  return Object.freeze({
    exitDoor,
    round: new Round({ events, exitDoor, candiesRequired: config.round.candiesRequired }),
    player: new Player(config.player, new CollisionWorld(tileMap, obstacles)),
    flashlight: new Flashlight(config.flashlight, events),
    beam: new FlashlightBeam(tileMap, config.flashlight),
    ghost: new Ghost({ config: config.ghost, tileMap, spawnTable, events }),
    pickups: new PickupField(config.player.pickupRadius),
    footstepCue: new FootstepCue(events, config.player),
    candyNearbyCue: new CandyNearbyCue(events, config.round),
    ambientNoiseCue: new AmbientNoiseCue(events, config.round),
  });
}

function createViews({ config, events, tileMap, world, render }) {
  const house = new HouseView(render.scene, tileMap, { furniture: FURNITURE, portraits: PORTRAITS, wallHeight: WALL_HEIGHT });
  return Object.freeze({
    firstPerson: new FirstPersonView(render.camera, {
      eyeHeight: config.player.eyeHeight,
      flashlight: config.flashlight,
      shadowMapSize: config.rendering.shadowMapSize,
    }),
    lighting: new HouseLightingView(render.scene, events, {
      lanterns: LANTERNS,
      fireplace: FIREPLACE,
      lanternIntensity: config.rendering.lanternIntensity,
      fireIntensity: config.rendering.fireIntensity,
    }),
    exitDoor: new ExitDoorView(render.scene, world.exitDoor, EXIT_DOOR, {
      wallMaterial: house.wallMaterial,
      wallHeight: WALL_HEIGHT,
      lightIntensity: config.rendering.exitIntensity,
    }),
    ghost: new GhostView(render.scene, world.ghost, config.ghost),
    pickups: new PickupView(render.scene, world.pickups, config.flashlight),
  });
}

function createUi({ config, events }) {
  const screenOptions = { candiesRequired: config.round.candiesRequired, leaderboardSize: config.ui.leaderboardSize };
  const effects = new ScreenEffects();
  return Object.freeze({
    title: new TitleScreen(screenOptions),
    pause: new PauseScreen(),
    result: new ResultScreen({ ...screenOptions, inputDelayMs: config.ui.resultInputDelayMs }),
    effects,
    hud: new HudDirector(events, new Hud(), effects),
  });
}
