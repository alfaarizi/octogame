import * as THREE from 'three';
import { createPumpkinFaceTexture, createPumpkinTexture } from '../textures.js';

export const LANTERN_FACE_GLOW = 1.4;

/** A carved jack-o'-lantern with its face on the +z side. Returns { object, glowMaterial }. */
export function createLanternModel() {
  const glowMaterial = new THREE.MeshStandardMaterial({
    map: createPumpkinTexture(),
    emissiveMap: createPumpkinFaceTexture(),
    emissive: 0xffa030,
    emissiveIntensity: LANTERN_FACE_GLOW,
    roughness: 0.7,
  });
  const pumpkin = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), glowMaterial);
  pumpkin.scale.y = 0.82;
  pumpkin.castShadow = true;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.024, 0.07, 8),
    new THREE.MeshStandardMaterial({ color: 0x3b3a1c }),
  );
  stem.position.y = 0.15;
  const object = new THREE.Group();
  object.add(pumpkin, stem);
  return { object, glowMaterial };
}
