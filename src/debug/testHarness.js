/**
 * With ?test in the URL, exposes the game as window.__test so automated browser checks can drive it.
 * Pointer lock is simulated in that mode (see SimulatedPointerLock), since test browsers refuse it.
 */
export function installTestHarness(game, context) {
  window.__test = Object.freeze({
    game,
    context,
    simulation: context.simulation,
    startRound: (playerName = 'Tester', chickenMode = false) => game.startRound({ playerName, chickenMode }),
  });
}
