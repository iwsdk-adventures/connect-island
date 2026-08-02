/**
 * Mouse-look for the 2D browser.
 *
 * IWSDK's browser locomotion moves `world.player` along the camera's forward
 * direction but deliberately does not own the camera - "rotate `world.camera`
 * yourself for pointer-lock, orbit, touch-look, or follow cameras" - so the
 * look half of the HUD's "drag to look, WASD to move" has to live in the app.
 * Locomotion is the other half, and it only exists once
 * `world.locomotion.browserControls` is on; it ships off.
 *
 * Yaw and pitch are accumulated from pointer deltas and written as a YXZ euler.
 * The order matters: with the default XYZ, combining yaw and pitch rolls the
 * horizon, which reads as the whole island tilting as you look around.
 *
 * The camera is only taken over once the visitor asks for control, so the
 * landing flight keeps its authored shots until then - and inside an immersive
 * session the headset owns the camera and this stays out of the way.
 */

import { Euler, MathUtils, VisibilityState, createSystem } from '@iwsdk/core';

/** Radians per pixel of drag. */
const SENSITIVITY = 0.0026;
/** Just short of straight up and down, so the view never flips over. */
const PITCH_LIMIT = MathUtils.degToRad(85);

export class BrowserLookSystem extends createSystem({}) {
  private euler!: Euler;
  private yaw = 0;
  private pitch = 0;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  /**
   * The landing flight owns the camera until the visitor presses Explore, and
   * a pinned debug time never dispatches that, so a review render stays put.
   */
  private active = false;

  init(): void {
    this.euler = new Euler(0, 0, 0, 'YXZ');

    const canvas = this.world.renderer.domElement;

    // Drag starts on the canvas so the landing buttons still behave like
    // buttons, but tracks on the window so a fast drag that leaves the canvas
    // does not silently detach.
    const down = (event: PointerEvent): void => {
      if (!this.active || event.button !== 0) {
        return;
      }
      this.dragging = true;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
    };
    const move = (event: PointerEvent): void => {
      if (!this.dragging) {
        return;
      }
      this.yaw -= (event.clientX - this.lastX) * SENSITIVITY;
      this.pitch -= (event.clientY - this.lastY) * SENSITIVITY;
      this.pitch = MathUtils.clamp(this.pitch, -PITCH_LIMIT, PITCH_LIMIT);
      this.lastX = event.clientX;
      this.lastY = event.clientY;
    };
    const release = (): void => {
      this.dragging = false;
    };
    const take = (): void => {
      this.active = true;
    };

    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('connect-island:explore', take);

    this.cleanupFuncs.push(() => {
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('connect-island:explore', take);
    });
  }

  update(): void {
    if (!this.active) {
      return;
    }
    // Inside a session the headset owns the camera; writing to it here would
    // fight the pose coming off the device.
    if (this.world.visibilityState.peek() !== VisibilityState.NonImmersive) {
      return;
    }
    this.euler.set(this.pitch, this.yaw, 0);
    this.world.camera.quaternion.setFromEuler(this.euler);
  }
}
