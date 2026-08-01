/**
 * Cinematic camera flight for the 2D landing page.
 *
 * While the page is in browser (non-immersive) mode and the flight has not been
 * dismissed, the player rig is driven along a closed Catmull-Rom spline through
 * authored waypoints, with a second spline for the look-at target. Both are
 * sampled with `getPointAt`, which is arc-length parameterised, so the camera
 * holds a steady speed instead of accelerating through the tight corners.
 *
 * The rig is moved rather than the camera itself: the camera is a child of the
 * player, so driving the parent keeps `lookAt` working in world space and
 * leaves the camera's own local transform free for XR to own.
 *
 * The flight yields as soon as the visitor takes control — entering XR, or
 * pressing Explore — and the rig is returned to the authored spawn.
 */

import {
  CatmullRomCurve3,
  Vector3,
  VisibilityState,
  createSystem,
} from '@iwsdk/core';
import {
  DEBUG_REVIEW_EYE,
  DEBUG_REVIEW_TARGET,
  DEBUG_TIME_OF_DAY,
} from '../debug-time.js';

/** Eye positions, in world space, in tour order. */
const PATH: Array<[number, number, number]> = [
  [0, 5.5, 32],
  [-7.5, 2.4, 24],
  [-4.5, 2.0, 16.5],
  [6.5, 2.6, 14],
  [10.5, 3.2, 4],
  [7.5, 2.0, -5.5],
  [1.5, 2.6, -12],
  [-8.5, 2.2, -12.5],
  [-15, 2.0, -4],
  [-11, 3.0, 8],
  [-2, 8.5, 22],
];

/** What the camera is looking at, sampled in step with PATH. */
const TARGETS: Array<[number, number, number]> = [
  [0, 1.6, 18.5],
  [0, 1.5, 18.5],
  [0, 2.2, 8.0],
  [0, 2.4, 0],
  [0, 2.4, 0],
  [12, 2.6, -6.9],
  [12, 2.6, -6.9],
  [-12, 1.2, -6.9],
  [-12, 1.2, -6.9],
  [0, 2.6, 0],
  [0, 3.2, 6],
];

const LOOP_SECONDS = 46;

export class CameraFlightSystem extends createSystem({}) {
  private pathCurve!: CatmullRomCurve3;
  private targetCurve!: CatmullRomCurve3;
  private eye!: Vector3;
  private focus!: Vector3;
  private spawn!: Vector3;
  private elapsed = 0;
  private active = true;

  init(): void {
    this.pathCurve = new CatmullRomCurve3(
      PATH.map(([x, y, z]) => new Vector3(x, y, z)),
      true,
      'catmullrom',
      0.5,
    );
    this.targetCurve = new CatmullRomCurve3(
      TARGETS.map(([x, y, z]) => new Vector3(x, y, z)),
      true,
      'catmullrom',
      0.5,
    );
    this.eye = new Vector3();
    this.focus = new Vector3();
    this.spawn = this.world.player.position.clone();



    // The landing page owns the dismiss control.
    const stop = () => this.release();
    window.addEventListener('connect-site:explore', stop);
    this.cleanupFuncs.push(() =>
      window.removeEventListener('connect-site:explore', stop),
    );
  }

  /** Hand control back to the visitor and restore the authored spawn. */
  private release(): void {
    if (!this.active) {
      return;
    }
    this.active = false;
    this.world.player.position.copy(this.spawn);
    this.world.camera.position.set(0, 1.6, 0);
    this.world.camera.rotation.set(0, 0, 0);
  }

  update(delta: number): void {
    // While a debug time is pinned, hold one pose so successive frames differ
    // only by time of day. This has to run every frame, not once in init:
    // releasing the rig hands the camera to the browser orbit controls, which
    // then drive it from the project config and ignore any one-shot placement.
    if (DEBUG_TIME_OF_DAY !== null) {
      this.world.player.position.set(...DEBUG_REVIEW_EYE);
      this.world.camera.position.set(0, 0, 0);
      this.world.camera.lookAt(...DEBUG_REVIEW_TARGET);
      return;
    }

    if (!this.active) {
      return;
    }
    // Any immersive session means the visitor is in the scene for real.
    if (this.world.visibilityState.peek() !== VisibilityState.NonImmersive) {
      this.release();
      return;
    }

    this.elapsed = (this.elapsed + delta / LOOP_SECONDS) % 1;
    this.pathCurve.getPointAt(this.elapsed, this.eye);
    this.targetCurve.getPointAt(this.elapsed, this.focus);

    this.world.player.position.copy(this.eye);
    this.world.camera.position.set(0, 0, 0);
    this.world.camera.lookAt(this.focus);
  }
}
