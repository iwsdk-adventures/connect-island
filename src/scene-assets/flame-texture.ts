/**
 * Procedural flame texture.
 *
 * Every review round called the fire "a faceted low-poly cone" or "a plastic
 * traffic cone". The root cause is geometric: any lathe or cone has a hard
 * silhouette, and no opacity value hides a hard edge. A soft alpha ramp on
 * crossed quads has no silhouette at all, which is the only way to get a
 * believable flame without a custom shader.
 *
 * Deterministic and allocation-free after module evaluation.
 */

import { DataTexture, RGBAFormat, SRGBColorSpace, Texture } from '@iwsdk/core';

const WIDTH = 64;
const HEIGHT = 128;

function buildFlameTexture(): Texture {
  const data = new Uint8Array(WIDTH * HEIGHT * 4);

  for (let y = 0; y < HEIGHT; y += 1) {
    // v: 0 at the base, 1 at the tip.
    const v = y / (HEIGHT - 1);
    // Flame narrows toward the tip, with a slight belly low down.
    const halfWidth = (1 - v) ** 0.72 * 0.9 + 0.035;

    for (let x = 0; x < WIDTH; x += 1) {
      const u = (x / (WIDTH - 1)) * 2 - 1;
      const d = Math.abs(u) / halfWidth;

      // Squared falloff gives a soft edge instead of a hard cutoff.
      let alpha = Math.max(0, 1 - d * d);
      alpha *= (1 - v) ** 0.5;
      // Break the outline so it is not a clean parabola.
      alpha *= 0.82 + 0.18 * Math.sin(v * 11 + u * 2.5);
      alpha = Math.min(1, Math.max(0, alpha));

      // Hot core near the axis and low down, cooling toward the tip.
      const core = Math.max(0, 1 - d * 1.85) * (1 - v * 0.72);

      const i = (y * WIDTH + x) * 4;
      data[i] = 255;
      data[i + 1] = Math.round(78 + core * 165);
      data[i + 2] = Math.round(16 + core * 130);
      data[i + 3] = Math.round(alpha * 255);
    }
  }

  const texture = new DataTexture(data, WIDTH, HEIGHT, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export const flameTexture = buildFlameTexture();
