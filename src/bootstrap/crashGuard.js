/*
 * Crash guard. Loaded as a classic script (deliberately not a module) before any game code,
 * so it still works when a game file is missing or has a syntax error.
 * Any uncaught error stops the game and shows the "press R" screen; refreshing starts clean.
 * Game code talks to it through window.crashGuard (see src/app/crashReporter.js).
 */
(function installCrashGuard() {
  'use strict';

  var BOOT_TIMEOUT_MS = 6000;
  var hasCrashed = false;
  var hasBooted = false;
  var cleanup = null;

  function showCrashScreen(message) {
    document.getElementById('crash-msg').textContent = message;
    document.getElementById('crash').classList.remove('hidden');
  }

  function report(message) {
    if (hasCrashed) return;
    hasCrashed = true;
    try {
      if (cleanup) cleanup();
    } catch (ignored) {
      // Already crashing; the screen matters more than a clean shutdown.
    }
    if (document.pointerLockElement) document.exitPointerLock();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { showCrashScreen(message); });
    } else {
      showCrashScreen(message);
    }
  }

  window.crashGuard = Object.freeze({
    report: report,
    setCleanup: function (fn) { cleanup = fn; },
    markBooted: function () { hasBooted = true; },
  });

  window.addEventListener('error', function (event) {
    // Harmless browser noise
    if (/ResizeObserver/.test(event.message)) return;
    report(event.error && event.error.stack ? event.error.stack : event.message || 'Unknown error');
  });

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    report(reason && reason.stack ? reason.stack : String(reason));
  });

  // A <script> that fails to download fires `error` on the element itself, which only a capturing listener sees.
  document.addEventListener('error', function (event) {
    if (event.target instanceof HTMLScriptElement) report('Could not load ' + event.target.src);
  }, true);

  window.addEventListener('keydown', function (event) {
    if (hasCrashed && event.code === 'KeyR') window.location.reload();
  });

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('crash-restart').addEventListener('click', function () { window.location.reload(); });
  });

  setTimeout(function () {
    if (!hasBooted) report('The game code did not finish loading.');
  }, BOOT_TIMEOUT_MS);
})();
