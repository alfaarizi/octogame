import * as THREE from 'three';

/** Schedules an exposure on the next world frame and encodes its JPEG asynchronously. */
export class PhotographyView {
  #render;
  #album;
  #flash = new THREE.PointLight(0xe1f5ed, 0, 12, 2);
  #remaining = 0;
  #pending = [];
  #retainedPhotos = [];
  #generation = 0;

  constructor(render, album) {
    this.#render = render; this.#album = album;
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
    if (!photo.isNewEvidence) return;
    this.#retainedPhotos = retainedPhotos;
    this.#pending.push(photo);
  }

  /** Called after the world pass, before the hands and camera are drawn. */
  afterWorldRender() {
    const generation = this.#generation;
    for (const photo of this.#pending.splice(0)) {
      try {
        this.#render.captureWorldPhoto(blob => {
          if (generation !== this.#generation) return;
          if (!blob) return this.#album.reportCaptureFailure(photo);
          this.#album.add(photo, URL.createObjectURL(blob), this.#retainedPhotos);
        });
      } catch (error) {
        this.#album.reportCaptureFailure(photo);
        console.warn('Photo image could not be captured', error);
      }
    }
  }

  update(seconds) {
    if (this.#pending.length) return;
    this.#remaining = Math.max(0, this.#remaining - seconds);
    this.#flash.intensity = 32 * this.#remaining / .12;
    this.#flash.visible = this.#remaining > 0;
  }

  reset() {
    this.#generation++;
    this.#pending.length = 0;
    this.#retainedPhotos = [];
    this.#remaining = 0;
    this.#flash.intensity = 0;
    this.#flash.visible = false;
    this.#album.reset();
  }
}
