import * as THREE from 'three';

/** Captures real rendered pixels and briefly lights the scene during an exposure. */
export class PhotographyView {
  #render;
  #firstPerson;
  #album;
  #flash = new THREE.PointLight(0xe1f5ed, 0, 12, 2);
  #remaining = 0;

  constructor(render, firstPerson, album) {
    this.#render = render; this.#firstPerson = firstPerson; this.#album = album;
    this.#flash.position.set(0, 0, -.1);
    this.#flash.castShadow = true;
    this.#flash.shadow.mapSize.set(512, 512);
    this.#flash.visible = false;
    render.camera.add(this.#flash);
  }

  capture(photo, retainedPhotos) {
    this.#flash.visible = true;
    this.#flash.intensity = 32;
    this.#remaining = .12;
    try {
      const dataUrl = this.#firstPerson.withoutHeldItem(() => this.#render.capturePhoto());
      this.#album.add(photo, dataUrl, retainedPhotos);
    } catch (error) {
      this.#album.reportCaptureFailure(photo);
      console.warn('Photo image could not be captured', error);
    }
  }

  update(seconds) {
    this.#remaining = Math.max(0, this.#remaining - seconds);
    this.#flash.intensity = 32 * this.#remaining / .12;
    this.#flash.visible = this.#remaining > 0;
  }

  reset() { this.#remaining = 0; this.#flash.intensity = 0; this.#flash.visible = false; this.#album.reset(); }
}
