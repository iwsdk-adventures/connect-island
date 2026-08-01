/**
 * Advances the water shader's flow clock.
 *
 * The three voronoi samples drift at different rates off this one value, so a
 * single scalar animates the whole surface. Kept small — the flow vectors in
 * the shader are large, so a slow clock reads as gentle swell rather than a
 * river.
 */

import { createSystem } from '@iwsdk/core';
import { waterUniforms } from '../scene-assets/water.scene-asset.js';

const FLOW_RATE = 0.008;

export class WaterSystem extends createSystem({}) {
  update(delta: number): void {
    waterUniforms.uWaveTime.value += delta * FLOW_RATE;
  }
}
