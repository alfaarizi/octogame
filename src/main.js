import { crashReporter } from './app/crashReporter.js';
import { createGameContext } from './app/createGameContext.js';
import { Game } from './app/Game.js';
import { GAME_CONFIG } from './config/gameConfig.js';
import { installTestHarness } from './debug/testHarness.js';

const isTestMode = new URLSearchParams(window.location.search).has('test');

const context = createGameContext({ config: GAME_CONFIG, isTestMode });
const game = new Game(context);

crashReporter.onCrash(() => {
  game.stop();
  context.audio.suspend();
});
if (isTestMode) installTestHarness(game, context);

game.start();
crashReporter.markBooted();
