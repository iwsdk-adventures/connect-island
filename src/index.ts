/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Fog, PCFShadowMap, VisibilityState, World } from '@iwsdk/core';
import { SHADOW_MODE } from './render-config.js';
import { BlobShadowSystem } from './systems/blob-shadows.js';
import { StageScreenLayerSystem } from './systems/stage-screen-layer.js';
import { frozenTimeOfDay } from './debug-time.js';
import projectOptions from 'virtual:iwsdk-project';
import { CameraFlightSystem } from './systems/camera-flight.js';
import { DayNightSystem } from './systems/day-night.js';
import { FirePitSystem } from './systems/firepit.js';
import { MonumentSystem } from './systems/monument.js';
import { StageLightSystem } from './systems/stage-lights.js';
import { WaterSystem } from './systems/water.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  // IWSDK leaves the renderer's shadow map off and offers no project-config
  // switch for it. Turning it on costs a second pass over every casting mesh
  // plus a depth comparison per lit fragment on every receiver, so it is behind
  // a switch while the headset budget is being worked out - see render-config.
  //
  // It also only does anything in combination with two other things: the shadow
  // flags the asset prototypes set (see shadowProp / shadowReceiver in
  // palette.ts) and DayNightSystem owning the key light, which is what finally
  // got the sun pointing at the site rather than away from it.
  world.renderer.shadowMap.enabled = SHADOW_MODE === 'real';
  // PCF rather than PCFSoft: the soft variant takes many more taps per
  // fragment, and at this map size the extra softness is not worth it on mobile.
  world.renderer.shadowMap.type = PCFShadowMap;

  // Aerial perspective, keyed to the sky's horizon band so the ground disc
  // dissolves into it rather than ending in a hard rim.
  world.scene.fog = new Fog('#bcd0e4', 140, 2200);

  world.registerSystem(CameraFlightSystem);
  world.registerSystem(FirePitSystem);
  world.registerSystem(StageLightSystem);
  world.registerSystem(MonumentSystem);
  world.registerSystem(WaterSystem);
  world.registerSystem(DayNightSystem);
  world.registerSystem(BlobShadowSystem);
  world.registerSystem(StageScreenLayerSystem);

  dismissLoading();
  bindLanding(world);
});

/**
 * Clears the loading overlay.
 *
 * Everything the visitor waits for is inside `World.create()` - the module
 * graph, the PBR textures, the UIKitML panels and their font atlases, and the
 * level instantiation - so its resolution is the honest moment to uncover the
 * canvas. It is not the moment the site becomes visible: three.js defers every
 * GL upload to the first draw that touches it, so the whole site's geometry,
 * textures and programs land in one frame just after this runs, and the main
 * thread is blocked while they do. The overlay leaves on an opacity transition
 * for that reason - the compositor owns it, so the fade plays out over the
 * block instead of freezing halfway through it.
 */
function dismissLoading(): void {
  document.getElementById('loading')?.classList.add('done');
}

/**
 * Wires the HTML landing page to the runtime.
 *
 * The XR entry point is a DOM button rather than an in-world panel: a spatial
 * panel floating in front of an empty venue is the first thing a visitor sees,
 * and it reads as debug UI. The camera flight plays behind the overlay until
 * the visitor picks a way in.
 */
function bindLanding(world: Awaited<ReturnType<typeof World.create>>): void {
  const landing = document.getElementById('landing');
  const enterButton = document.getElementById('enter-xr');
  const exploreButton = document.getElementById('explore');
  const note = document.getElementById('xr-note');
  const hud = document.getElementById('hud');

  if (world.xrEnabled) {
    enterButton?.removeAttribute('hidden');
  } else {
    note?.removeAttribute('hidden');
  }

  // A pinned debug time means somebody is reviewing the render. The landing
  // scrim is a near-opaque navy gradient over the bottom half of the viewport,
  // which is indistinguishable from dark ground in a screenshot - so get it out
  // of the way, but leave the camera pinned (CameraFlight ignores the event
  // while a debug time is set).
  if (frozenTimeOfDay() !== null) {
    landing?.classList.add('dismissed');
    return;
  }

  const dismiss = (showHud: boolean): void => {
    landing?.classList.add('dismissed');
    // The flight system listens for this and hands the rig back.
    window.dispatchEvent(new Event('connect-island:explore'));
    if (showHud) {
      hud?.removeAttribute('hidden');
      window.setTimeout(() => hud?.setAttribute('hidden', ''), 6000);
    }
  };

  enterButton?.addEventListener('click', () => {
    dismiss(false);
    void world.launchXR();
  });
  exploreButton?.addEventListener('click', () => dismiss(true));

  // Entering XR by any other route should also clear the overlay.
  world.visibilityState.subscribe((state) => {
    if (state !== VisibilityState.NonImmersive) {
      landing?.classList.add('dismissed');
      hud?.setAttribute('hidden', '');
    }
  });
}
