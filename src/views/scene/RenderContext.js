import * as THREE from 'three';

const CAMERA_NEAR = 0.05;
const CAMERA_FAR = 60;
const NOOP = () => {};

/** Owns the WebGL renderer, the scene and the camera, plus the scene-wide fog and moonlight. */
export class RenderContext {
  #renderer;
  #scene;
  #camera;
  #cameraFeed;
  #screenScene = new THREE.Scene();
  #screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  constructor(container, config) {
    this.#renderer = new THREE.WebGLRenderer({ antialias: true });
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.maxPixelRatio));
    this.#renderer.setSize(window.innerWidth, window.innerHeight);
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.#renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.#renderer.toneMappingExposure = config.exposure;
    this.#cameraFeed = new THREE.WebGLRenderTarget(this.canvas.width, this.canvas.height, { depthBuffer: true, stencilBuffer: false });
    this.#cameraFeed.texture.colorSpace = THREE.LinearSRGBColorSpace;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ map: this.#cameraFeed.texture, depthTest: false, depthWrite: false }),
    );
    this.#screenScene.add(screen);
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

  get cameraFeedTexture() {
    return this.#cameraFeed.texture;
  }

  /** Draws the world once into a shared texture, then overlays the held item. */
  render(cameraPreviewActive = false, afterWorldRender = NOOP) {
    this.#camera.layers.set(0);
    if (cameraPreviewActive) this.#renderer.setRenderTarget(this.#cameraFeed);
    try {
      this.#renderer.render(this.#scene, this.#camera);
    } finally {
      if (cameraPreviewActive) this.#renderer.setRenderTarget(null);
    }
    if (cameraPreviewActive) this.#renderer.render(this.#screenScene, this.#screenCamera);
    afterWorldRender();

    const background = this.#scene.background;
    const autoClear = this.#renderer.autoClear;
    try {
      this.#scene.background = null;
      this.#renderer.autoClear = false;
      this.#renderer.clearDepth();
      this.#camera.layers.set(1);
      this.#renderer.render(this.#scene, this.#camera);
    } finally {
      this.#camera.layers.set(0);
      this.#renderer.autoClear = autoClear;
      this.#scene.background = background;
    }
  }

  /** Copies the world pass before the held item is drawn; JPEG compression runs off the input event. */
  captureWorldPhoto(onReady) {
    const image = document.createElement('canvas');
    image.width = 960;
    image.height = Math.round(image.width * this.canvas.height / this.canvas.width);
    image.getContext('2d').drawImage(this.canvas, 0, 0, image.width, image.height);
    image.toBlob(onReady, 'image/jpeg', 0.85);
  }

  #fitToWindow() {
    this.#camera.aspect = window.innerWidth / window.innerHeight;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(window.innerWidth, window.innerHeight);
    this.#cameraFeed.setSize(this.canvas.width, this.canvas.height);
  }
}
