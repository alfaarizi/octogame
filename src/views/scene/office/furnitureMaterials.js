import * as THREE from 'three';
import { furnitureFinishTexture } from './textures.js';

const WOOD_COLORS = new Set([0x6b4226, 0x3b2a20, 0x8a6a3c, 0x5a3a24, 0x4a3426, 0x6e5a48, 0xcfcac2]);
const FABRIC_COLORS = new Set([0x303236, 0x5d6064, 0x7a5236, 0x1f3324, 0xa08a3c]);
const STONE_COLORS = new Set([0x8a8680, 0x9a9a96, 0x8d8a84]);
const CERAMIC_COLORS = new Set([0xbfc4c6, 0xd2d2ca]);
const PLASTIC_COLORS = new Set([0x2e2e30, 0x131d20, 0x283236]);
const RUBBER_COLORS = new Set([0x26282b]);
const METAL_COLORS = new Set([0x2b2b2e, 0x3c3f44, 0x1b1d20, 0xc9ccce, 0x9a9a9a, 0x777777]);
const FINISH = Object.freeze({
  wood: { roughness: .8, metalness: 0, bumpScale: .018 },
  fabric: { roughness: 1, metalness: 0, bumpScale: .012 },
  stone: { roughness: .92, metalness: 0, bumpScale: .012 },
  ceramic: { roughness: .32, metalness: 0, bumpScale: .002 },
  plastic: { roughness: .72, metalness: 0, bumpScale: .004 },
  rubber: { roughness: 1, metalness: 0, bumpScale: .015 },
  metal: { roughness: .55, metalness: .35, bumpScale: .004 },
  painted: { roughness: .83, metalness: .03, bumpScale: .007 },
});

function finishFor(color) {
  if (WOOD_COLORS.has(color)) return 'wood';
  if (FABRIC_COLORS.has(color)) return 'fabric';
  if (STONE_COLORS.has(color)) return 'stone';
  if (CERAMIC_COLORS.has(color)) return 'ceramic';
  if (PLASTIC_COLORS.has(color)) return 'plastic';
  if (RUBBER_COLORS.has(color)) return 'rubber';
  if (METAL_COLORS.has(color)) return 'metal';
  return 'painted';
}

/** Each authored color keeps its identity while sharing a finish texture with similar surfaces. */
export function createFurnitureMaterial(color) {
  const finish = finishFor(color);
  const texture = furnitureFinishTexture(finish);
  return new THREE.MeshStandardMaterial({ color, map: texture, bumpMap: texture, ...FINISH[finish] });
}
