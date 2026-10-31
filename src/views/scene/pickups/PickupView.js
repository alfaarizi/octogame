import * as THREE from 'three';
import { createEquipmentModel } from '../player/equipmentModels.js';

/** Ground items have physical silhouettes and a faint marker visible before acquiring a torch. */
export class PickupView {
  #scene;
  #field;
  #meshes = new Map();
  #snapshot = null;

  constructor(scene, field) { this.#scene = scene; this.#field = field; }

  sync() {
    if (this.#snapshot === this.#field.items) return;
    this.#snapshot = this.#field.items;
    const ids = new Set(this.#snapshot.map((item) => item.id));
    for (const [id, object] of this.#meshes) {
      if (ids.has(id)) continue;
      this.#scene.remove(object);
      object.traverse((mesh) => { mesh.geometry?.dispose(); if (mesh.material) mesh.material.dispose(); });
      this.#meshes.delete(id);
    }
    for (const item of this.#snapshot) {
      if (this.#meshes.has(item.id)) continue;
      const object = createEquipmentModel(item.kind);
      object.scale.setScalar(1.4);
      object.position.copy(item.position);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xb4dfd9 }));
      const glintPosition = {
        flashlight: { x: 0, y: 0, z: -.12 },
        camera: { x: -.07, y: .075, z: -.06 },
        battery: { x: 0, y: .11, z: 0 },
      };
      glint.position.copy(glintPosition[item.kind]);
      object.add(glint);
      this.#scene.add(object);
      this.#meshes.set(item.id, object);
    }
  }

  update() { this.sync(); }
}
