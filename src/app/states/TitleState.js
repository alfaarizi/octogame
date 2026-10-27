import { STANDING_STILL } from '../../gameplay/Player.js';

const IDLE_LOOK = Object.freeze({ yawRate: 0.18, yawSwing: 0.7, pitch: -0.08, pitchRate: 0.11, pitchSwing: 0.05 });

/** The title screen, over the dark foyer with the camera slowly looking around. */
export class TitleState {
  #context;
  #prefill;
  #elapsed = 0;

  /** @param prefill { playerName, chickenMode } to put in the form */
  constructor(context, prefill) {
    this.#context = context;
    this.#prefill = prefill;
  }

  enter() {
    const { persistence, ui, views, world } = this.#context;
    world.ghost.deactivate();
    world.pickups.clear();
    world.exitDoor.lock();
    views.ghost.hide();
    views.pickups.sync();
    ui.hud.hide();
    ui.title.show(this.#prefill, persistence.scores.loadRanked());
  }

  exit() {
    this.#context.ui.title.hide();
  }

  update(seconds) {
    this.#elapsed += seconds;
    const { layout, views } = this.#context;
    const idlePose = {
      position: layout.playerStart,
      yaw: Math.sin(this.#elapsed * IDLE_LOOK.yawRate) * IDLE_LOOK.yawSwing,
      pitch: IDLE_LOOK.pitch + Math.sin(this.#elapsed * IDLE_LOOK.pitchRate) * IDLE_LOOK.pitchSwing,
    };
    views.firstPerson.update(seconds, idlePose, STANDING_STILL);
    views.firstPerson.setBeamBrightness(1);
  }
}
