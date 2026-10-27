import { ListenerSet } from './ListenerSet.js';

/**
 * Publish/subscribe hub. Gameplay announces what happened (see GameEvent) without knowing
 * who reacts; audio and HUD subscribe without gameplay knowing they exist.
 */
export class EventBus {
  #listenersByType = new Map();

  /** Subscribes to one event type. Returns a function that unsubscribes. */
  on(type, listener) {
    if (!this.#listenersByType.has(type)) this.#listenersByType.set(type, new ListenerSet());
    return this.#listenersByType.get(type).add(listener);
  }

  emit(type, payload = {}) {
    this.#listenersByType.get(type)?.notify(payload);
  }
}
