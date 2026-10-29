import { crashReporter } from './app/crashReporter.js';
import { createGameContext } from './app/createGameContext.js';
import { fetchJson } from './app/fetchJson.js';
import { GAME_CONFIG } from './config/gameConfig.js';
import { GameController } from './controllers/GameController.js';
import { installTestHarness } from './debug/testHarness.js';
import { loadLevel } from './models/level/loadLevel.js';

const LEVEL_URL = new URL('data/office/building.json', document.baseURI);

async function start() {
  const isTestMode = new URLSearchParams(window.location.search).has('test');
  const level = await loadLevel(LEVEL_URL, fetchJson);
  const context = createGameContext({ config: GAME_CONFIG, level, isTestMode });
  const game = new GameController(context);

  crashReporter.onCrash(() => {
    game.stop();
    context.audio.suspend();
  });
  if (isTestMode) installTestHarness(game, context);

  game.start();
  crashReporter.markBooted();
}

start().catch((error) => crashReporter.report(error));
