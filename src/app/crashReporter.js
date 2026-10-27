/** Bridge to the crash screen set up by bootstrap/crashGuard.js, which loads before any module. */
export const crashReporter = Object.freeze({
  report(error) {
    window.crashGuard.report(error?.stack ?? String(error));
  },

  /** Runs `cleanup` (stop the loop, silence audio) the moment anything crashes. */
  onCrash(cleanup) {
    window.crashGuard.setCleanup(cleanup);
  },

  /** Tells the guard the game started, so it doesn't report a load timeout. */
  markBooted() {
    window.crashGuard.markBooted();
  },
});
