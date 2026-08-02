/**
 * Cinematic camera for the 2D landing page.
 *
 * A sequence of authored SHOTS, cut between rather than flown between. Each
 * shot is a slow push or drift from one eye/target pair to another over its own
 * duration; when it ends the camera cuts straight to the next one.
 *
 * This replaced a single closed Catmull-Rom loop through every viewpoint. A
 * spline that has to visit eleven points around a site and come back cannot
 * avoid swinging wide through the gaps between them, and arc-length sampling
 * only fixes the speed, not the swerving - so the motion read as a drone
 * fighting its own path rather than as camerawork. A cut costs nothing, the
 * footage does not have to be continuous, and each shot can now be framed for
 * one subject instead of being a compromise on the way to the next.
 *
 * Within a shot the motion is eased at both ends, so nothing starts or stops
 * abruptly and there is no velocity discontinuity to see.
 *
 * The rig is moved rather than the camera itself: the camera is a child of the
 * player, so driving the parent keeps `lookAt` working in world space and
 * leaves the camera's own local transform free for XR to own.
 *
 * The sequence yields as soon as the visitor takes control - entering XR, or
 * pressing Explore - and the rig is returned to the authored spawn.
 */

import { Vector3, VisibilityState, createSystem } from '@iwsdk/core';
import {
  DEBUG_REVIEW_EYE,
  DEBUG_REVIEW_TARGET,
  frozenTimeOfDay,
} from '../debug-time.js';

type Triple = readonly [number, number, number];

interface Shot {
  /** Eye at the start and end of the shot. */
  from: Triple;
  to: Triple;
  /** Look-at at the start and end. */
  lookFrom: Triple;
  lookTo: Triple;
  seconds: number;
}

/**
 * The tour. Deliberately short moves: a shot that travels far in a few seconds
 * reads as a fly-through, and the point of these is to present a place.
 */
const SHOTS: Shot[] = [
  // Arrival, over the entrance circle, pushing in on the monument.
  {
    from: [0, 3.4, 30],
    to: [0, 2.6, 23],
    lookFrom: [0, 1.9, 17.5],
    lookTo: [0, 1.9, 16.8],
    seconds: 7,
  },
  // Past the monument, the pavilion rising behind it.
  {
    from: [3.6, 2.0, 20.5],
    to: [-2.2, 2.0, 18.0],
    lookFrom: [0, 1.7, 16.4],
    lookTo: [0, 2.6, 2.0],
    seconds: 7,
  },
  // Crossing the bridge over the moat.
  {
    from: [1.2, 1.8, 12.5],
    to: [0.4, 1.8, 8.0],
    lookFrom: [0, 2.0, 3.0],
    lookTo: [0, 2.2, 0.5],
    seconds: 6,
  },
  // Inside the pavilion, drifting across the three cards.
  {
    from: [3.1, 1.7, 3.4],
    to: [-3.1, 1.7, 3.4],
    lookFrom: [0.9, 1.75, -0.4],
    lookTo: [-0.9, 1.75, -0.4],
    seconds: 8,
  },
  // High three-quarter of the whole rounded triangle.
  {
    from: [24, 11, 27],
    to: [18, 9, 22],
    lookFrom: [-1, 1.5, -2],
    lookTo: [-1, 1.5, -2],
    seconds: 8,
  },
  // The stage, from the audience side.
  {
    from: [8.6, 2.2, -4.0],
    to: [11.4, 2.0, -6.6],
    lookFrom: [15.7, 2.4, -9.1],
    lookTo: [15.7, 2.2, -9.1],
    seconds: 7,
  },
  // The firepit lounge.
  {
    from: [-8.4, 2.4, -3.0],
    to: [-11.0, 1.9, -5.4],
    lookFrom: [-14.3, 1.2, -8.25],
    lookTo: [-14.3, 1.0, -8.25],
    seconds: 7,
  },
  // Pull back out over the water to close the loop.
  {
    from: [-20, 6.0, 12],
    to: [-12, 4.2, 21],
    lookFrom: [0, 2.4, 2],
    lookTo: [0, 2.2, 10],
    seconds: 8,
  },
];

export class CameraFlightSystem extends createSystem({}) {
  private eye!: Vector3;
  private focus!: Vector3;
  private spawn!: Vector3;
  private shot = 0;
  private elapsed = 0;
  private active = true;

  init(): void {
    this.eye = new Vector3();
    this.focus = new Vector3();
    this.spawn = this.world.player.position.clone();

    // The landing page owns the dismiss control.
    const stop = () => this.release();
    window.addEventListener('connect-island:explore', stop);
    this.cleanupFuncs.push(() =>
      window.removeEventListener('connect-island:explore', stop),
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
    if (frozenTimeOfDay() !== null) {
      // Indexed rather than spread: `set(...tuple)` builds an arguments array
      // every frame, and this branch runs every frame while a time is pinned.
      this.world.player.position.set(
        DEBUG_REVIEW_EYE[0],
        DEBUG_REVIEW_EYE[1],
        DEBUG_REVIEW_EYE[2],
      );
      this.world.camera.position.set(0, 0, 0);
      this.world.camera.lookAt(
        DEBUG_REVIEW_TARGET[0],
        DEBUG_REVIEW_TARGET[1],
        DEBUG_REVIEW_TARGET[2],
      );
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

    const shot = SHOTS[this.shot];
    this.elapsed += delta;
    if (this.elapsed >= shot.seconds) {
      // Cut. No blend: the next shot simply starts.
      this.elapsed = 0;
      this.shot = (this.shot + 1) % SHOTS.length;
      return;
    }

    // Smoothstep, so a shot eases out of its start and into its end rather than
    // snapping to a constant velocity the instant it cuts in.
    const k = this.elapsed / shot.seconds;
    const e = k * k * (3 - 2 * k);

    this.eye.set(
      shot.from[0] + (shot.to[0] - shot.from[0]) * e,
      shot.from[1] + (shot.to[1] - shot.from[1]) * e,
      shot.from[2] + (shot.to[2] - shot.from[2]) * e,
    );
    this.focus.set(
      shot.lookFrom[0] + (shot.lookTo[0] - shot.lookFrom[0]) * e,
      shot.lookFrom[1] + (shot.lookTo[1] - shot.lookFrom[1]) * e,
      shot.lookFrom[2] + (shot.lookTo[2] - shot.lookFrom[2]) * e,
    );

    this.world.player.position.copy(this.eye);
    this.world.camera.position.set(0, 0, 0);
    this.world.camera.lookAt(this.focus);
  }
}
