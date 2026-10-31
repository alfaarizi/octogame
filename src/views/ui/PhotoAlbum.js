import { requireElement } from './dom.js';

/** Session-only JPEGs. Downloads are explicit links; old frames are evicted with model metadata. */
export class PhotoAlbum {
  #images = new Map();
  #containers = [requireElement('pause-photos'), requireElement('result-photos')];
  #checklist = requireElement('evidence-checklist');

  reset() {
    this.#images.clear();
    for (const container of this.#containers) container.replaceChildren();
  }

  add(photo, dataUrl, retainedPhotos) {
    const ids = new Set(retainedPhotos.map((entry) => entry.id));
    for (const id of this.#images.keys()) if (!ids.has(id)) this.#images.delete(id);
    this.#images.set(photo.id, { photo, dataUrl });
    this.#render();
  }

  reportCaptureFailure(photo) {
    requireElement('hint').textContent = `Shot ${photo.id}: image capture unavailable. Evidence progress was retained.`;
  }

  updateChecklist(photography) {
    this.#checklist.replaceChildren(...photography.subjects.map((subject) => {
      const row = document.createElement('li');
      row.textContent = `${photography.isDocumented(subject.id) ? '✓' : '○'} ${subject.name} — ${subject.clue}`;
      return row;
    }));
  }

  #render() {
    for (const container of this.#containers) {
      container.replaceChildren(...[...this.#images.values()].reverse().map(({ photo, dataUrl }) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `night-shift-${String(photo.id).padStart(3, '0')}.jpg`;
        link.title = `Download photo: ${photo.caption}`;
        const img = document.createElement('img'); img.src = dataUrl; img.alt = photo.caption;
        const caption = document.createElement('span'); caption.textContent = `${photo.isNewEvidence ? '✓ ' : ''}${photo.caption} ↓`;
        link.append(img, caption);
        return link;
      }));
    }
  }
}
