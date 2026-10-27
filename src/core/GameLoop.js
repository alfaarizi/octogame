/** Calls `onFrame(seconds)` once per animation frame, and stops at the first uncaught error. */
export class GameLoop {
  #onFrame;
  #onError;
  #maxStepSeconds;
  #previousTimeMs = null;
  #isRunning = false;

  constructor({ onFrame, onError, maxStepSeconds = 0.05 }) {
    this.#onFrame = onFrame;
    this.#onError = onError;
    this.#maxStepSeconds = maxStepSeconds;
  }

  start() {
    if (this.#isRunning) return;
    this.#isRunning = true;
    this.#previousTimeMs = null;
    requestAnimationFrame(this.#tick);
  }

  stop() {
    this.#isRunning = false;
  }

  #tick = (timeMs) => {
    if (!this.#isRunning) return;
    requestAnimationFrame(this.#tick);
    // Clamped so a long stall (tab in the background) doesn't teleport anything.
    const seconds = this.#previousTimeMs === null ? 0 : Math.min((timeMs - this.#previousTimeMs) / 1000, this.#maxStepSeconds);
    this.#previousTimeMs = timeMs;
    try {
      this.#onFrame(seconds);
    } catch (error) {
      this.stop();
      this.#onError(error);
    }
  };
}
