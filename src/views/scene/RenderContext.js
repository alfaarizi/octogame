import * as THREE from 'three';

const CAMERA_NEAR = 0.05;
const CAMERA_FAR = 60;

/** Owns the WebGL renderer, the scene and the camera, plus the scene-wide fog and moonlight. */
export class RenderContext {
  #renderer;
  #scene;
  #camera;

  constructor(container, config) {
    this.#renderer = new THREE.WebGLRenderer({ antialias: true });
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.maxPixelRatio));
    this.#renderer.setSize(window.innerWidth, window.innerHeight);
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.#renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.#renderer.toneMappingExposure = config.exposure;
    container.prepend(this.#renderer.domElement);

    this.#scene = new THREE.Scene();
    this.#scene.background = new THREE.Color(0x000000);
    this.#scene.fog = new THREE.FogExp2(0x000000, config.fogDensity);
    this.#scene.add(new THREE.HemisphereLight(config.moonlightSkyColor, config.moonlightGroundColor, config.moonlightIntensity));

    this.#camera = new THREE.PerspectiveCamera(config.fieldOfView, window.innerWidth / window.innerHeight, CAMERA_NEAR, CAMERA_FAR);
    // Added so that lights attached to the camera are part of the scene.
    this.#scene.add(this.#camera);

    window.addEventListener('resize', () => this.#fitToWindow());
  }

  get scene() {
    return this.#scene;
  }

  get camera() {
    return this.#camera;
  }

  get canvas() {
    return this.#renderer.domElement;
  }

  render() {
    this.#renderer.render(this.#scene, this.#camera);
  }

  #fitToWindow() {
    this.#camera.aspect = window.innerWidth / window.innerHeight;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
