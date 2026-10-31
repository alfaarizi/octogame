import { distanceBetween, isWithinCone } from '../../utils.js';

/** Camera exposure rules and a bounded metadata album. Pixels belong to the view. */
export class Photography {
  #config;
  #building;
  #subjects;
  #photos = [];
  #documented = new Set();
  #readyAt = 0;
  #nextId = 1;

  constructor(config, building, subjects) {
    this.#config = config;
    this.#building = building;
    this.#subjects = subjects;
  }

  get subjects() { return this.#subjects; }
  get photos() { return [...this.#photos]; }
  isDocumented(id) { return this.#documented.has(id); }
  reset() { this.#photos = []; this.#documented.clear(); this.#readyAt = 0; this.#nextId = 1; }

  target(sight) {
    return this.#subjects.find((subject) =>
      distanceBetween(sight.origin, subject) >= this.#config.minDistance
      && isWithinCone(sight, this.#config, subject)
      && this.#building.hasClearRay(sight.origin, subject)) ?? null;
  }

  take(sight, elapsed) {
    if (elapsed < this.#readyAt) return null;
    this.#readyAt = elapsed + this.#config.cooldown;
    const subject = this.target(sight);
    const isNewEvidence = Boolean(subject && !this.#documented.has(subject.id));
    if (subject) this.#documented.add(subject.id);
    const photo = Object.freeze({
      id: this.#nextId++, elapsed, subjectId: subject?.id ?? null,
      caption: subject?.name ?? 'No anomaly in frame', isNewEvidence,
    });
    this.#photos.push(photo);
    // Keep all evidence shots, evict ordinary/duplicate exposures first.
    if (this.#photos.length > this.#config.albumSize) {
      const expendable = this.#photos.findIndex((entry) => !entry.isNewEvidence);
      this.#photos.splice(expendable < 0 ? 0 : expendable, 1);
    }
    return photo;
  }
}
