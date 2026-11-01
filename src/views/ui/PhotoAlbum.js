import { requireElement } from './dom.js';

/** Session-only JPEGs. Downloads are explicit links; object URLs are released on eviction. */
export class PhotoAlbum {
  #images = new Map();
  #containers = [requireElement('pause-photos'), requireElement('result-photos')];
  #checklist = requireElement('evidence-checklist');

  reset() {
    for (const { imageUrl } of this.#images.values()) URL.revokeObjectURL(imageUrl);
    this.#images.clear();
    for (const container of this.#containers) container.replaceChildren();
  }

  add(photo, imageUrl, retainedPhotos) {
    const ids = new Set(retainedPhotos.map((entry) => entry.id));
    if (!ids.has(photo.id)) { URL.revokeObjectURL(imageUrl); return; }
    for (const [id, image] of this.#images) {
      if (ids.has(id)) continue;
      URL.revokeObjectURL(image.imageUrl);
      this.#images.delete(id);
    }
    this.#images.set(photo.id, { photo, imageUrl });
    this.#render();
  }

  reportCaptureFailure(photo) {
    requireElement('hint').textContent = `Shot ${photo.id}: image capture unavailable. Evidence progress was retained.`;
  }

  updateChecklist(photography) {
    this.#checklist.replaceChildren(...photography.subjects.map((subject, index) => {
      const documented = photography.isDocumented(subject.id);
      const row = document.createElement('li');
      row.className = documented ? 'documented' : 'missing';
      const number = document.createElement('span');
      number.className = 'evidence-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const detail = document.createElement('div');
      detail.className = 'evidence-entry';
      const name = document.createElement('strong');
      name.textContent = subject.name;
      detail.append(name);
      const status = document.createElement('span');
      status.className = 'evidence-status';
      status.textContent = documented ? 'FILED' : 'MISSING';
      row.append(number, detail, status);
      return row;
    }));
  }

  #render() {
    for (const container of this.#containers) {
      container.replaceChildren(...[...this.#images.values()].sort((a, b) => b.photo.id - a.photo.id).map(({ photo, imageUrl }) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `night-shift-${String(photo.id).padStart(3, '0')}.jpg`;
        link.title = `Download photo: ${photo.caption}`;
        const img = document.createElement('img'); img.src = imageUrl; img.alt = photo.caption;
        const caption = document.createElement('span'); caption.textContent = photo.caption;
        link.append(img, caption);
        return link;
      }));
    }
  }
}
