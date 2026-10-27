import * as THREE from 'three';

const CANDY_COLORS = [0xff3b3b, 0xffa51f, 0x9b4dff, 0x2fd16a, 0xff5fb0, 0x35b8ff];
const CANDY_SCALE = 1.4;
const BATTERY_SCALE = 1.3;
export const RESTING_GLOW = 0.06;

// Shared by every pickup; only the materials differ, so each one can glint on its own.
const candyWrapperBody = new THREE.CylinderGeometry(0.055, 0.055, 0.12, 14).rotateZ(Math.PI / 2);
const candyTwistLeft = new THREE.ConeGeometry(0.05, 0.07, 10).rotateZ(-Math.PI / 2).translate(-0.095, 0, 0);
const candyTwistRight = new THREE.ConeGeometry(0.05, 0.07, 10).rotateZ(Math.PI / 2).translate(0.095, 0, 0);
const batteryCell = new THREE.CylinderGeometry(0.045, 0.045, 0.17, 16);
const batteryBand = new THREE.CylinderGeometry(0.047, 0.047, 0.05, 16).translate(0, 0.06, 0);
const batteryTerminal = new THREE.CylinderGeometry(0.016, 0.016, 0.02, 10).translate(0, 0.095, 0);

/** A wrapped sweet in a random color. Returns { object, glowMaterial }. */
export function createCandyModel() {
  const color = CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)];
  const glowMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: RESTING_GLOW,
    roughness: 0.3,
    metalness: 0.1,
  });
  const object = new THREE.Group();
  for (const geometry of [candyWrapperBody, candyTwistLeft, candyTwistRight]) object.add(new THREE.Mesh(geometry, glowMaterial));
  object.scale.setScalar(CANDY_SCALE);
  return { object, glowMaterial };
}

/** A green battery cell with brass ends. Returns { object, glowMaterial }. */
export function createBatteryModel() {
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f7a33,
    emissive: 0x2fd16a,
    emissiveIntensity: RESTING_GLOW,
    roughness: 0.4,
  });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd9c24a, metalness: 0.7, roughness: 0.3 });
  const object = new THREE.Group();
  object.add(new THREE.Mesh(batteryCell, glowMaterial), new THREE.Mesh(batteryBand, brass), new THREE.Mesh(batteryTerminal, brass));
  object.scale.setScalar(BATTERY_SCALE);
  return { object, glowMaterial };
}
