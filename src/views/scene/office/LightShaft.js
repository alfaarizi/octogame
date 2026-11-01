import * as THREE from 'three';

/** @typedef {import('../../../types.js').Point3} Point3 */

const RADIAL_SEGMENTS = 24;

/** Softens the cone's silhouette so the shaft fades out instead of ending in a hard edge. */
const VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
varying vec3 vFacing;
varying vec3 vView;
void main() {
  vUv = uv;
  vFacing = normalize(normalMatrix * normal);
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-viewPosition.xyz);
  gl_Position = projectionMatrix * viewPosition;
}`;

const FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vFacing;
varying vec3 vView;
void main() {
  float edge = abs(dot(normalize(vFacing), vView));
  float soft = pow(edge, 1.4);
  float along = 0.2 + 0.8 * vUv.y;
  gl_FragColor = vec4(uColor, uOpacity * soft * along);
}`;

/**
 * A subtle god ray: a translucent cone of haze shining away from a light, additive so it only
 * brightens what is behind it. Its brightness follows the light's dimming, so a stuttering or
 * turned-off light shows no ray.
 * @param {object} ray
 * @param {number} ray.color
 * @param {Point3} ray.position - The cone's narrow end sits at the light's position.
 * @param {Point3} ray.direction - Where the light shines.
 * @param {number} ray.length - Cone length, in meters.
 * @param {number} ray.radiusTop - Cone radius at the light.
 * @param {number} ray.radius - Cone radius at the far end.
 * @param {number} [ray.opacity] - Shaft opacity at strength 1; kept low so the ray stays subtle.
 * @returns {{ mesh: THREE.Mesh, setStrength: (strength: number) => void }}
 */
export function createLightShaft({ color, position, direction, length, radiusTop, radius, opacity = 0.16 }) {
  const geometry = new THREE.CylinderGeometry(radiusTop, radius, length, RADIAL_SEGMENTS, 1, true);
  geometry.translate(0, -length / 2, 0); // The cone grows along -Y, away from the light.
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.quaternion.setFromUnitVectors(AXIS_TOWARDS_LIGHT, normalizeDirection(direction));
  mesh.renderOrder = 2;
  return {
    mesh,
    /** @param {number} strength - Matches its light's 0..1+ strength. */
    setStrength(strength) {
      material.uniforms.uOpacity.value = opacity * Math.max(0, Math.min(1.25, strength));
    },
  };
}

const AXIS_TOWARDS_LIGHT = new THREE.Vector3(0, -1, 0);

function normalizeDirection({ x, y, z }) {
  return new THREE.Vector3(x, y, z).normalize();
}
