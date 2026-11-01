import { distanceBetween, isWithinFrame } from '../../utils.js';

/** Camera exposure rules and metadata for distinct crime evidence. Pixels belong to the view. */
export class Photography {
  #config;
  #frame;
  #building;
  #subjects;
  #photos = [];
  #documented = new Set();
  #readyAt = 0;
  #nextId = 1;

  constructor(config, building, subjects) {
    this.#config = config;
    this.#frame = { ...config.frame, range: config.range };
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
      && isWithinFrame(sight, this.#frame, subject)
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
    if (isNewEvidence) this.#photos.push(photo);
    return photo;
  }
}
