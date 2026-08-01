/**
 * Distant mountain skyline.
 *
 * The site sits on a finite ground disc, and without something on the horizon
 * that disc terminates in a visible rim against the sky. A silhouette ridge
 * ring hides the rim, gives the venue a sense of place, and reads as depth
 * rather than as a wall.
 *
 * Two concentric ridges at different radii and tones do the parallax work: the
 * far one is paler and lower-contrast, the near one darker and taller, so the
 * horizon has layers instead of one flat cutout.
 *
 * Unlit (MeshBasicMaterial) and fog-affected on purpose — the ridges are
 * backdrop, not lit geometry, and letting scene fog wash them keeps them
 * sitting behind the aerial perspective rather than in front of it.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  DoubleSide,
} from '@iwsdk/core';

const SEGMENTS = 128;

/**
 * Layered sine ridges. Deterministic — no RNG, so the manifest evaluates
 * identically in the runtime and the editor.
 */
function ridgeHeight(angle: number, seed: number, scale: number): number {
  const a = angle + seed;
  return (
    scale *
    (0.52 +
      0.3 * Math.sin(a * 3.0 + seed) +
      0.22 * Math.sin(a * 7.0 - seed * 2.1) +
      0.13 * Math.sin(a * 13.0 + seed * 0.7) +
      0.08 * Math.sin(a * 23.0 - seed * 1.3))
  );
}

/** A closed ring of silhouette peaks, open at the top, standing on y = base. */
function buildRidge(
  radius: number,
  scale: number,
  seed: number,
  base: number,
  peakShade: number,
): BufferGeometry {
  const positions = new Float32Array(SEGMENTS * 6 * 3);
  const colors = new Float32Array(SEGMENTS * 6 * 3);
  let cursor = 0;

  // Vertex ramp: 1 at the base, `peakShade` at the summits. Multiplied by the
  // material colour (which tracks the sky's horizon band) this makes each ridge
  // meet the horizon at exactly the sky's value and darken with height, so the
  // range fades into the background instead of sitting on it as a pale cutout.
  const push = (x: number, y: number, z: number, shade: number): void => {
    positions[cursor] = x;
    positions[cursor + 1] = y;
    positions[cursor + 2] = z;
    colors[cursor] = shade;
    colors[cursor + 1] = shade;
    colors[cursor + 2] = shade;
    cursor += 3;
  };

  for (let i = 0; i < SEGMENTS; i += 1) {
    const a0 = (i / SEGMENTS) * Math.PI * 2;
    const a1 = ((i + 1) / SEGMENTS) * Math.PI * 2;
    const x0 = Math.cos(a0) * radius;
    const z0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius;
    const z1 = Math.sin(a1) * radius;
    const h0 = base + ridgeHeight(a0, seed, scale);
    const h1 = base + ridgeHeight(a1, seed, scale);

    // Two triangles per segment. Two-sided: the ring is viewed from inside and
    // single-sided winding here silently renders nothing.
    push(x0, base, z0, 1);
    push(x1, base, z1, 1);
    push(x0, h0, z0, peakShade);

    push(x1, base, z1, 1);
    push(x1, h1, z1, peakShade);
    push(x0, h0, z0, peakShade);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

const skyline = new Group();
skyline.name = 'Skyline';

// Sized to sit just above the waterline, not to loom: roughly 13-30 m of relief
// at 470-780 m reads as a distant range (2-4 degrees). Anything taller turns the
// site into a crater.
const RIDGES: Array<{
  radius: number;
  scale: number;
  seed: number;
  base: number;
  color: string;
}> = [
  { radius: 780, scale: 52, seed: 0.4, base: -14, color: '#a8bccf' },
  { radius: 610, scale: 38, seed: 2.7, base: -11, color: '#93a8c0' },
  { radius: 470, scale: 26, seed: 5.1, base: -8, color: '#8098b3' },
];

/**
 * Exposed so DayNightSystem can tint them. Unlit geometry cannot respond to
 * lights, so without this the ridges hold one value all cycle — glowing brighter
 * than the sky at night and vanishing into it at noon.
 *
 * `aerial` is how much of the ridge's own colour survives: the far ridge is
 * mostly sky, the near one keeps more of itself.
 */
export const ridgeMaterials: MeshBasicMaterial[] = [];
export const RIDGE_AERIAL: readonly number[] = [0.1, 0.18, 0.28];
/** How dark each ridge's summits go relative to its base. Far ranges flatter. */
const PEAK_SHADE = [0.9, 0.84, 0.76];

RIDGES.forEach((ridge, index) => {
  // Fog deliberately OFF. These are unlit and heavily distant, so scene fog was
  // overriding the tint entirely and pinning them near the fog colour — which is
  // brighter than the zenith at night, leaving the far range glowing. With fog
  // off the cycle sets their value exactly, and the baked vertex ramp supplies
  // the haze blend at the base instead.
  const material = new MeshBasicMaterial({
    color: ridge.color,
    side: DoubleSide,
    fog: false,
    vertexColors: true,
  });
  ridgeMaterials.push(material);
  const mesh = new Mesh(
    buildRidge(
      ridge.radius,
      ridge.scale,
      ridge.seed,
      ridge.base,
      PEAK_SHADE[index] ?? 0.8,
    ),
    material,
  );
  mesh.name = `Ridge ${index}`;
  skyline.add(mesh);
});

export default skyline;
