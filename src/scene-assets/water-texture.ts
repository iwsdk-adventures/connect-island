/**
 * Procedural voronoi normal map for the water surface.
 *
 * ProjectFlowerbed's water shader samples a voronoi normal map three times at
 * different scales and flow rates and sums the result. Rather than ship their
 * PNG this generates an equivalent map at load: cell seeds are placed on a
 * wrapped grid so the texture tiles seamlessly, a distance field is built from
 * the nearest seed, and the normal comes from the field's gradient.
 *
 * Deterministic — a fixed integer hash, no RNG — so the manifest evaluates
 * identically in the app runtime and the editor.
 */

import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  RepeatWrapping,
  Texture,
} from '@iwsdk/core';

const SIZE = 256;
const CELLS = 6;
const BUMP = 2.6;

/** Deterministic hash to [0,1). */
function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/** Distance to the nearest cell seed, on a wrapped domain. */
function voronoi(u: number, v: number): number {
  const cellU = Math.floor(u * CELLS);
  const cellV = Math.floor(v * CELLS);
  let best = 1e9;

  for (let dv = -1; dv <= 1; dv += 1) {
    for (let du = -1; du <= 1; du += 1) {
      const cu = cellU + du;
      const cv = cellV + dv;
      // Wrap the seed lookup so opposite edges agree.
      const wu = ((cu % CELLS) + CELLS) % CELLS;
      const wv = ((cv % CELLS) + CELLS) % CELLS;
      const seedU = (cu + hash(wu, wv)) / CELLS;
      const seedV = (cv + hash(wv + 17, wu + 5)) / CELLS;
      const dx = u - seedU;
      const dy = v - seedV;
      const d = dx * dx + dy * dy;
      if (d < best) {
        best = d;
      }
    }
  }
  return Math.sqrt(best) * CELLS;
}

function buildVoronoiNormalMap(): Texture {
  const height = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      // Rounded cells: the field peaks at the seed and falls off to the edges.
      height[y * SIZE + x] = 1 - Math.min(1, voronoi(x / SIZE, y / SIZE));
    }
  }

  const at = (x: number, y: number): number =>
    height[(((y % SIZE) + SIZE) % SIZE) * SIZE + (((x % SIZE) + SIZE) % SIZE)];

  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      // Central differences give the surface gradient; the normal is its
      // negation with a unit up component, then renormalised.
      const dx = (at(x + 1, y) - at(x - 1, y)) * BUMP;
      const dy = (at(x, y + 1) - at(x, y - 1)) * BUMP;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * SIZE + x) * 4;
      data[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }

  const texture = new DataTexture(data, SIZE, SIZE, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  // DataTexture defaults to NearestFilter with no mipmaps, which is what made
  // the water show hard texels close up and shimmer at distance: the shader
  // samples this map three times per fragment across a surface stretching to
  // the horizon, so minification without mipmaps aliases badly and the noise
  // crawls as the flow offsets move.
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export const voronoiNormalMap = buildVoronoiNormalMap();
