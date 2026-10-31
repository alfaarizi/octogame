/** Persistent state for searchable containers and hiding, independent of graphics and input. */
export class OfficeInteractions {
  #definitions;
  #opened = new Set();
  #hiding = null;
  #returnPosition = null;
  #witnessed = false;

  constructor(definitions = []) { this.#definitions = definitions; }
  get objects() { return this.#definitions; }
  get hidingPlace() { return this.#hiding; }
  get isHidden() { return this.#hiding !== null; }
  get isConcealed() { return this.isHidden && !this.#witnessed; }
  isOpened(id) { return this.#opened.has(id); }

  reset() { this.#opened.clear(); this.#hiding = null; this.#returnPosition = null; this.#witnessed = false; }

  open(id) {
    if (this.#opened.has(id)) return false;
    this.#opened.add(id);
    return true;
  }

  enter(closet, player, witnessed) {
    this.#returnPosition = { ...player.position };
    this.#hiding = closet;
    this.#witnessed = witnessed;
    const { box } = closet;
    Object.assign(player.position, { x: (box.x0 + box.x1) / 2, y: box.y0, z: (box.z0 + box.z1) / 2 });
    player.yaw = Math.PI; // All authored closets face south.
    player.pitch = 0;
  }

  leave(player) {
    if (!this.#hiding) return;
    Object.assign(player.position, this.#returnPosition);
    this.#hiding = null;
    this.#returnPosition = null;
    this.#witnessed = false;
  }
}
