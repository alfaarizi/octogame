import * as THREE from 'three';
import { Tile } from '../../world/TileMap.js';
import { createBoxMesh, createBoxMeshFromBounds } from '../meshes.js';
import { createFloorTexture, createPortraitTexture, createWallpaperTexture } from './textures.js';

const FLOOR_TEXTURE_METERS = 2;
// Rugs and other parts this thin don't cast shadows
const FLAT_PART_HEIGHT = 0.05;
const PORTRAIT = Object.freeze({ frameWidth: 0.8, frameHeight: 1.0, frameDepth: 0.05, pictureWidth: 0.66, pictureHeight: 0.86, centerHeight: 1.75 });

/** Builds the house's static meshes: walls, floor, ceiling, furniture and portraits. */
export class HouseView {
  #scene;
  #wallMaterial;

  constructor(scene, tileMap, { furniture, portraits, wallHeight }) {
    this.#scene = scene;
    this.#wallMaterial = new THREE.MeshStandardMaterial({ map: createWallpaperTexture(wallHeight), roughness: 0.95 });
    this.#buildWalls(tileMap, wallHeight);
    this.#buildFloorAndCeiling(tileMap, wallHeight);
    this.#buildFurniture(furniture);
    for (const portrait of portraits) this.#buildPortrait(portrait);
  }

  /** Shared with the exit door's lintel so it matches the walls. */
  get wallMaterial() {
    return this.#wallMaterial;
  }

  #buildWalls(tileMap, wallHeight) {
    const wallTiles = [];
    tileMap.forEachTile((tile, x, z) => tile === Tile.WALL && wallTiles.push([x, z]));
    const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, wallHeight, 1), this.#wallMaterial, wallTiles.length);
    const placement = new THREE.Matrix4();
    wallTiles.forEach(([x, z], index) => walls.setMatrixAt(index, placement.makeTranslation(x + 0.5, wallHeight / 2, z + 0.5)));
    walls.castShadow = walls.receiveShadow = true;
    this.#scene.add(walls);
  }

  #buildFloorAndCeiling(tileMap, wallHeight) {
    const { width, depth } = tileMap;
    const floorTexture = createFloorTexture();
    floorTexture.repeat.set(width / FLOOR_TEXTURE_METERS, depth / FLOOR_TEXTURE_METERS);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.8 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(width / 2, 0, depth / 2);
    floor.receiveShadow = true;

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshStandardMaterial({ color: 0x1d1714, roughness: 1 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(width / 2, wallHeight, depth / 2);
    ceiling.receiveShadow = true;
    this.#scene.add(floor, ceiling);
  }

  #buildFurniture(furniture) {
    const materialsByColor = new Map();
    const materialFor = (color) => {
      if (!materialsByColor.has(color)) materialsByColor.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
      return materialsByColor.get(color);
    };
    for (const piece of furniture) {
      for (const part of piece.parts) {
        const mesh = createBoxMeshFromBounds(part, materialFor(part.color));
        mesh.castShadow = part.y1 - part.y0 > FLAT_PART_HEIGHT;
        mesh.receiveShadow = true;
        this.#scene.add(mesh);
      }
    }
  }

  /** A framed portrait hanging on the south-facing wall face at (x, z). */
  #buildPortrait({ x, z }) {
    const frame = createBoxMesh(
      [PORTRAIT.frameWidth, PORTRAIT.frameHeight, PORTRAIT.frameDepth],
      [x, PORTRAIT.centerHeight, z + PORTRAIT.frameDepth / 2],
      new THREE.MeshStandardMaterial({ color: 0x4a3514, roughness: 0.5, metalness: 0.4 }),
    );
    const picture = new THREE.Mesh(
      new THREE.PlaneGeometry(PORTRAIT.pictureWidth, PORTRAIT.pictureHeight),
      new THREE.MeshStandardMaterial({ map: createPortraitTexture(), roughness: 0.9 }),
    );
    picture.position.set(x, PORTRAIT.centerHeight, z + PORTRAIT.frameDepth + 0.002);
    this.#scene.add(frame, picture);
  }
}
