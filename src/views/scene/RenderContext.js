import * as THREE from 'three';

const CAMERA_NEAR = 0.05;
const CAMERA_FAR = 60;

/** Owns the WebGL renderer, the scene and the camera, plus the scene-wide fog and moonlight. */
export class RenderContext {
  #renderer;
  #scene;
  #camera;
  #cameraFeed = new THREE.WebGLRenderTarget(384, 240, { depthBuffer: true, stencilBuffer: false });

  constructor(container, config) {
    this.#renderer = new THREE.WebGLRenderer({ antialias: true });
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.maxPixelRatio));
    this.#renderer.setSize(window.innerWidth, window.innerHeight);
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.#renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.#renderer.toneMappingExposure = config.exposure;
    this.#cameraFeed.texture.colorSpace = THREE.SRGBColorSpace;
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

  /** Draws the scene into the camera's rear LCD, restoring the main framebuffer afterward. */
  updateCameraFeed() {
    const previousTarget = this.#renderer.getRenderTarget();
    try {
      this.#renderer.setRenderTarget(this.#cameraFeed);
      this.#renderer.render(this.#scene, this.#camera);
    } finally {
      this.#renderer.setRenderTarget(previousTarget);
    }
  }

  render() {
    this.#renderer.render(this.#scene, this.#camera);
  }

  /** Read immediately after rendering, before WebGL clears its drawing buffer. */
  capturePhoto() {
    this.render();
    const image = document.createElement('canvas');
    image.width = 960;
    image.height = Math.round(image.width * this.canvas.height / this.canvas.width);
    image.getContext('2d').drawImage(this.canvas, 0, 0, image.width, image.height);
    return image.toDataURL('image/jpeg', 0.85);
  }

  #fitToWindow() {
    this.#camera.aspect = window.innerWidth / window.innerHeight;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
