/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { AssetType, defineAssets } from '@iwsdk/core';
import bench from './scene-assets/bench.scene-asset.js';
import bollard from './scene-assets/bollard.scene-asset.js';
import entranceGate from './scene-assets/entrance-gate.scene-asset.js';
import firepit from './scene-assets/firepit.scene-asset.js';
import ground from './scene-assets/ground.scene-asset.js';
import monument from './scene-assets/monument.scene-asset.js';
import palmTall from './scene-assets/palm-tall.scene-asset.js';
import pavilion from './scene-assets/pavilion.scene-asset.js';
import planterMonstera from './scene-assets/planter-monstera.scene-asset.js';
import planterPalm from './scene-assets/planter-palm.scene-asset.js';
import seatPod from './scene-assets/seat-pod.scene-asset.js';
import signPost from './scene-assets/sign-post.scene-asset.js';
import skyline from './scene-assets/skyline.scene-asset.js';
import water from './scene-assets/water.scene-asset.js';
import stage from './scene-assets/stage.scene-asset.js';
import wayfindingPylon from './scene-assets/wayfinding-pylon.scene-asset.js';

const publicAssetUrl = (filePath: string): string =>
  `${import.meta.env.BASE_URL}${filePath.replace(/^\/+/u, '')}`;

export default defineAssets({
  // Site structures — procedural Object3D prototypes.
  'site-ground': ground,
  pavilion,
  monument,
  'entrance-gate': entranceGate,
  firepit,
  'seat-pod': seatPod,
  stage,
  bench,
  'planter-palm': planterPalm,
  'planter-monstera': planterMonstera,
  'palm-tall': palmTall,
  bollard,
  'wayfinding-pylon': wayfindingPylon,
  'sign-post': signPost,
  skyline,
  water,

  // Spatial UI.
  'connect-panel': {
    url: publicAssetUrl('ui/connect-info.uikitml'),
    type: AssetType.UIKitML,
    name: 'Meta Connect Info Panel',
  },
  'iwsdk-panel': {
    url: publicAssetUrl('ui/iwsdk-info.uikitml'),
    type: AssetType.UIKitML,
    name: 'IWSDK Info Panel',
  },
  'visit-panel': {
    url: publicAssetUrl('ui/visit-info.uikitml'),
    type: AssetType.UIKitML,
    name: 'Site Guide Panel',
  },
  'entrance-sign': {
    url: publicAssetUrl('ui/entrance-sign.uikitml'),
    type: AssetType.UIKitML,
    name: 'Entrance Sign',
  },
  'stage-sign': {
    url: publicAssetUrl('ui/stage-sign.uikitml'),
    type: AssetType.UIKitML,
    name: 'Stage Schedule Sign',
  },
  'stage-screen': {
    url: publicAssetUrl('ui/stage-screen.uikitml'),
    type: AssetType.UIKitML,
    name: 'Stage Screen Slide',
  },
});
