import { GameEvent } from '../../core/GameEvent.js';
import { ItemKind, ITEM_NAMES, ITEM_RESTING_HEIGHT } from '../player/Inventory.js';

/** Coordinates item and office interactions without knowing about keys, meshes or the DOM. */
export class PlayerActions {
  constructor({ player, inventory, pickups, flashlight, photography, office, targeting, building, ghost, round, events, config }) {
    Object.assign(this, { player, inventory, pickups, flashlight, photography, office, targeting, building, ghost, round, events, config });
  }

  get target() {
    return this.targeting.find(this.player.sight, [
      ...this.pickups.items.map((item) => ({ type: 'pickup', item, position: item.position })),
      ...this.office.objects.map((item) => ({ type: 'office', item, position: item.position })),
    ]);
  }

  get prompt() {
    if (this.office.isHidden) return 'E · Leave closet';
    const target = this.target;
    if (!target) return '';
    const { item } = target;
    if (target.type === 'pickup') return this.inventory.isFull ? 'Hands full · Q to drop held item' : `E · Pick up ${ITEM_NAMES[item.kind]}`;
    if (item.kind === 'closet') return `E · Hide in ${item.name}`;
    if (item.kind === 'cache') return this.office.isOpened(item.id) ? 'Empty supply drawer' : `E · Search ${item.name}`;
    return `E · Read ${item.name}`;
  }

  syncEquipment() {
    this.flashlight.setEquipped(!this.office.isHidden && this.inventory.activeItem?.kind === ItemKind.FLASHLIGHT);
  }

  select(slot) {
    if (this.office.isHidden) return;
    this.inventory.select(slot);
    this.syncEquipment();
  }

  interact() {
    if (this.office.isHidden) {
      this.office.leave(this.player);
      this.syncEquipment();
      this.events.emit(GameEvent.HIDING_CHANGED, { hidden: false });
      return;
    }
    const target = this.target;
    if (!target) return;
    const { item } = target;
    if (target.type === 'pickup') {
      if (!this.inventory.pickUp(item)) return this.feedback('Both slots are full. Press Q to drop the held item.');
      this.pickups.remove(item.id);
      this.syncEquipment();
      this.events.emit(GameEvent.ITEM_PICKED_UP);
      this.feedback(`${ITEM_NAMES[item.kind]} collected · 1 / 2 select · Click to use`);
    } else if (item.kind === 'closet') {
      const witnessed = this.ghost.isPresent && this.building.hasLineOfSight(this.ghost.position, this.player.position)
        && Math.hypot(this.ghost.position.x - this.player.position.x, this.ghost.position.z - this.player.position.z) < this.config.ghost.spotRadius;
      this.office.enter(item, this.player, witnessed);
      this.syncEquipment();
      this.events.emit(GameEvent.HIDING_CHANGED, { hidden: true, witnessed });
      this.feedback(witnessed ? 'It saw you enter. This closet will not protect you!' : 'Hidden. Listen for it to pass. E to leave.');
    } else if (item.kind === 'cache') {
      if (!this.office.open(item.id)) return this.feedback('The supply drawer is empty.');
      this.pickups.add(ItemKind.BATTERY, { ...item.position, y: item.box.y1 + ITEM_RESTING_HEIGHT.battery });
      this.events.emit(GameEvent.OBJECT_INTERACTED, { position: item.position });
      this.feedback('A battery pack. Look at it and press E to pick it up.');
    } else {
      this.events.emit(GameEvent.OBJECT_INTERACTED, { position: item.position });
      this.feedback(item.text, 9);
    }
  }

  drop() {
    if (this.office.isHidden || !this.inventory.activeItem) return;
    const restingHeight = ITEM_RESTING_HEIGHT[this.inventory.activeItem.kind];
    const position = this.building.dropPosition(this.player.position, this.player.yaw,
      this.config.interaction.dropDistance, this.config.player.collisionRadius);
    position.y += restingHeight;
    const item = this.inventory.drop();
    this.pickups.add(item.kind, position, item.id);
    this.syncEquipment();
    this.events.emit(GameEvent.ITEM_DROPPED);
  }

  use() {
    if (this.office.isHidden) return null;
    const kind = this.inventory.activeItem?.kind;
    if (kind === ItemKind.FLASHLIGHT) this.flashlight.toggle();
    else if (kind === ItemKind.BATTERY) {
      if (!this.inventory.has(ItemKind.FLASHLIGHT)) return this.feedback('Pick up the flashlight before fitting a battery.');
      if (this.flashlight.charge >= 0.99) return this.feedback('The flashlight battery is already full.');
      this.flashlight.recharge(this.config.flashlight.batteryPickupCharge);
      this.inventory.drop();
      this.events.emit(GameEvent.BATTERY_COLLECTED);
    } else if (kind === ItemKind.CAMERA) {
      const photo = this.photography.take(this.player.sight, this.round.elapsed);
      if (!photo) return null;
      if (photo.isNewEvidence) this.round.recordEvidence();
      this.ghost.hearCamera(this.player.position, this.config.camera.noiseRadius);
      this.events.emit(GameEvent.PHOTO_TAKEN, photo);
      this.feedback(photo.isNewEvidence && this.round.evidenceCollected === this.round.evidenceRequired
        ? 'All five anomalies recorded. The main gate is open. RUN!'
        : photo.isNewEvidence ? `Evidence recorded: ${photo.caption}`
        : photo.subjectId ? 'Already documented. Photograph a different anomaly.' : 'Photo saved. Center an anomaly from 0.7–7 m away.');
      return photo;
    } else this.feedback('Your hand is empty. Look at equipment and press E.');
    return null;
  }

  feedback(text, seconds = 3) { this.events.emit(GameEvent.FEEDBACK, { text, seconds }); }
}
