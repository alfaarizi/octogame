import * as THREE from 'three';

/** A reusable, locally rendered sign; no remote font or image dependency. */
export function createLabel(text, width, height, background, foreground) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = background; c.fillRect(0, 0, 512, 128);
  c.fillStyle = foreground; c.font = 'bold 35px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, 256, 64, 490);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, emissive: 0x536454, emissiveIntensity: .12 }));
}
