import * as THREE from 'three';

/** The sheet's outline from hem to crown as [radius, height], spun around the y axis. */
export const GHOST_PROFILE = Object.freeze([
  [0.56, 0], [0.5, 0.12], [0.46, 0.45], [0.43, 0.9], [0.41, 1.2], [0.37, 1.45], [0.28, 1.64], [0.15, 1.76], [0.001, 1.8],
]);
export const GHOST_SEGMENTS = 32;
export const GHOST_EYE_HEIGHT = 1.46;
export const GHOST_OPACITY = 0.85;
export const MOUTH_HEIGHT = Object.freeze({ resting: 1.6, frozen: 2.3, screaming: 2.6 });

/**
 * The ghost: a pale sheet with hollow eyes and mouth, facing +z.
 * Returns the parts the view animates: { object, bodyGeometry, restPositions, bodyMaterial, mouth, pupils }.
 */
export function createGhostModel(glow) {
  const object = new THREE.Group();
  // Lean (x) is applied in the ghost's own frame, after turning (y).
  object.rotation.order = 'YXZ';

  const bodyGeometry = new THREE.LatheGeometry(GHOST_PROFILE.map(([radius, y]) => new THREE.Vector2(radius, y)), GHOST_SEGMENTS);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xe9eef6,
    emissive: 0x9fb4cc,
    emissiveIntensity: glow,
    roughness: 0.6,
    transparent: true,
    opacity: GHOST_OPACITY,
    side: THREE.DoubleSide,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.castShadow = true;
  object.add(body);

  const hollow = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const ember = new THREE.MeshBasicMaterial({ color: 0xff2a10 });
  const blob = new THREE.SphereGeometry(0.07, 14, 10);
  const pupils = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(blob, hollow);
    eye.scale.set(1, 1.45, 0.5);
    eye.position.set(side * 0.12, GHOST_EYE_HEIGHT, 0.33);
    eye.rotation.z = side * 0.25;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), ember);
    pupil.position.set(side * 0.12, 1.44, 0.37);
    pupil.visible = false;
    object.add(eye, pupil);
    pupils.push(pupil);
  }

  const mouth = new THREE.Mesh(blob, hollow);
  mouth.scale.set(0.9, MOUTH_HEIGHT.resting, 0.45);
  mouth.position.set(0, 1.2, 0.39);
  object.add(mouth);

  return { object, bodyGeometry, restPositions: bodyGeometry.attributes.position.array.slice(), bodyMaterial, mouth, pupils };
}
