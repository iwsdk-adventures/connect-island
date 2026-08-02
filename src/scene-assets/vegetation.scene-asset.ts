/**
 * Planting on the island outside the rounded triangle.
 *
 * Everything here is InstancedMesh. Placing each palm as its own Group of ~12
 * meshes cost a dozen trees ~140 draw calls; this puts several hundred plants
 * into four, which matters a lot more in a headset than on the desktop preview.
 *
 * Three storeys, because one alone never reads as landscape: palms for the
 * canopy, shrubs at waist height, and low tufts that stop the sand reading as
 * an empty plane between them. Tessellation drops with size - a tuft blade is
 * two triangles, a shrub leaf is a coarse extrusion, and only the fronds get
 * the smooth outline, since only they are ever seen against the sky.
 *
 * Scatter is deterministic - an integer hash, no RNG - because the asset
 * manifest is evaluated separately by the runtime and the editor and the two
 * must agree.
 *
 * Placement rejects anything inside the built area: a point is excluded if it
 * lies within the rounded triangle (inside all three edge half-planes, or
 * inside a corner circle) plus a margin, so nothing grows through a deck.
 */

import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  InstancedMesh,
  Group,
  Object3D,
} from '@iwsdk/core';
import { SITE, foliage, foliageDeep, leafGeometry, trunk } from './palette.js';

const PALMS = 120;
const SHRUBS = 200;
const TUFT_CLUMPS = 190;
/** Blades per clump site; a lone blade reads as litter, a patch reads as grass. */
const TUFTS_PER_CLUMP = 3;

const FRONDS = 10;
const SHRUB_LEAVES = 7;
const TUFT_BLADES = 4;

/** Keep-out margin beyond the built silhouette, in metres. */
const CLEARANCE = 2.9;
/** Tufts crowd closer to the decks than trees do; they are ankle height. */
const TUFT_CLEARANCE = 0.9;
const INNER_RADIUS = 16;
const OUTER_RADIUS = 44;

/** Deterministic hash to [0,1). */
function rand(i: number, salt: number): number {
  const n = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

const CORNERS = [
  SITE.corners.entrance,
  SITE.corners.stage,
  SITE.corners.firepit,
] as const;

/** True if the point falls on, or within `margin` of, the built rounded triangle. */
function isBuilt(x: number, z: number, margin: number): boolean {
  for (const [cx, cz] of CORNERS) {
    if (Math.hypot(x - cx, z - cz) < SITE.cornerCircleRadius + margin) {
      return true;
    }
  }
  // Inside all three edge half-planes means inside the triangle body. The edge
  // decks' outer face sits at inradius + cornerCircleRadius.
  const limit = SITE.inradius + SITE.cornerCircleRadius + margin;
  let inside = true;
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2;
    // Outward normal of each edge, pointing away from the centre.
    const nx = Math.sin(angle + Math.PI);
    const nz = Math.cos(angle + Math.PI);
    if (x * nx + z * nz > limit) {
      inside = false;
      break;
    }
  }
  return inside;
}

/**
 * Deterministic scatter of `count` points in the planting annulus.
 *
 * Points are drawn around a small number of grove centres rather than spread
 * evenly. An even scatter is the giveaway that planting was generated rather
 * than placed: uniform density at uniform spacing reads as a procedural test
 * field, not as landscape. Clumping into groves - with clearings between them -
 * is what makes it read as somewhere.
 *
 * `spread` is the grove radius in metres; pass a large one for ground cover
 * that should still feel continuous.
 */
function scatter(
  count: number,
  salt: number,
  margin: number,
  inner: number,
  groves = 9,
  spread = 7.5,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; points.length < count && i < count * 40; i += 1) {
    const grove = i % groves;
    // Grove centres are themselves scattered across the annulus.
    const groveAngle = rand(grove, salt + 3.3) * Math.PI * 2;
    const groveRadius = Math.sqrt(
      inner * inner +
        rand(grove, salt + 51) * (OUTER_RADIUS * OUTER_RADIUS - inner * inner),
    );
    // Denser at the middle of a grove, thinning at its edge. sqrt rather than a
    // product: squaring pulled almost everything to the grove centre and left
    // the ground between groves visibly bare.
    const drift = Math.sqrt(rand(i, salt)) * spread;
    const driftAngle = rand(i, salt + 17) * Math.PI * 2;
    const x = Math.sin(groveAngle) * groveRadius + Math.sin(driftAngle) * drift;
    const z = Math.cos(groveAngle) * groveRadius + Math.cos(driftAngle) * drift;
    const radius = Math.hypot(x, z);
    if (radius < inner || radius > OUTER_RADIUS || isBuilt(x, z, margin)) {
      continue;
    }
    points.push([x, z]);
  }
  return points;
}

/**
 * A grass blade: four vertices, two triangles, tapering to a point and leaning
 * slightly. Hundreds of these are the cheapest way to break up bare sand, so
 * they get no curve tessellation at all.
 */
function bladeGeometry(height: number, width: number): BufferGeometry {
  const positions = new Float32Array([
    -width / 2, 0, 0,
    width / 2, 0, 0,
    width * 0.18, height * 0.55, height * 0.1,
    -width * 0.3, height * 0.55, height * 0.1,
    width * 0.18, height * 0.55, height * 0.1,
    0, height, height * 0.3,
    -width * 0.3, height * 0.55, height * 0.1,
  ]);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  // Carries a uv it never samples, purely so its attribute set matches every
  // primitive geometry it might one day be merged alongside.
  geometry.setAttribute(
    'uv',
    new BufferAttribute(
      new Float32Array([0, 0, 1, 0, 1, 0.55, 0, 0.55, 1, 0.55, 0.5, 1, 0, 0.55]),
      2,
    ),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3, 3, 2, 5]);
  geometry.computeVertexNormals();
  return geometry;
}

const vegetation = new Group();
vegetation.name = 'Vegetation';

// Scratch hierarchy used to compose each instance's world matrix.
const root = new Object3D();
const crown = new Object3D();
const limb = new Object3D();
root.add(crown);
crown.add(limb);
// YXZ, not the default XYZ. These leaves are placed with a single Euler that
// carries both a droop (X) and a bearing around the crown (Y). Under XYZ the
// yaw is applied FIRST and the droop second, about a shared world axis - so
// every frond on a palm tipped the same way and the crown grew leaves down one
// side only. YXZ applies the droop in the leaf's own frame and then swings it
// around the trunk, which is what the nested pivot/leaf hierarchy does for the
// hand-authored palms.
limb.rotation.order = 'YXZ';

/**
 * One tapered cylinder per trunk, standing on its own base.
 *
 * The trunk was six stacked segments swept along a curve. Even sampling the
 * radius from one continuous taper, the lean moves consecutive segment centres
 * sideways by more than the trunk is wide near the crown, so the joints pulled
 * apart into a ladder of separate tubes with daylight and open ends showing
 * between them. A palm is near enough straight that a single tapered cylinder
 * with a few degrees of tilt reads better than a curve that cannot hold
 * together - and it is six times fewer instances.
 *
 * Translated so the origin is at the base, which means the tilt pivots about
 * the foot and the tree stays planted.
 */
const trunkGeometry = new CylinderGeometry(0.62, 1, 1, 7);
trunkGeometry.translate(0, 0.5, 0);
/** Trunk radius at the base; the geometry tapers to 62% of it at the crown. */
const TRUNK_BASE_RADIUS = 0.15;
// Only the fronds are ever silhouetted against the sky, so only they pay for a
// smooth outline.
const frondGeometry = leafGeometry(2.15, 0.6, 7);
const shrubGeometry = leafGeometry(0.62, 0.44, 4);
const tuftGeometry = bladeGeometry(0.42, 0.07);

// Palms in a handful of tight groves; undergrowth in more, looser ones, so the
// two layers do not share the same outline.
const palmSites = scatter(PALMS, 3.1, CLEARANCE, INNER_RADIUS, 17, 7.5);
const shrubSites = scatter(SHRUBS, 17.7, CLEARANCE, INNER_RADIUS, 23, 9.5);
// Grass grows in patches. Each scattered site seeds a few tufts within a metre
// of each other, which reads as ground cover; the same blade count spread
// evenly reads as scattered debris.
const tuftSites: Array<[number, number]> = [];
scatter(TUFT_CLUMPS, 61.3, TUFT_CLEARANCE, SITE.groundRadius * 0.32, 28, 12).forEach(
  ([cx, cz], c) => {
    for (let k = 0; k < TUFTS_PER_CLUMP; k += 1) {
      tuftSites.push([
        cx + (rand(c * 3 + k, 71.2) - 0.5) * 1.5,
        cz + (rand(c * 3 + k, 88.6) - 0.5) * 1.5,
      ]);
    }
  },
);

const trunks = new InstancedMesh(trunkGeometry, trunk, palmSites.length);
trunks.name = 'Palm trunks';
const fronds = new InstancedMesh(frondGeometry, foliage, palmSites.length * FRONDS);
fronds.name = 'Palm fronds';
const shrubs = new InstancedMesh(
  shrubGeometry,
  foliageDeep,
  shrubSites.length * SHRUB_LEAVES,
);
shrubs.name = 'Shrub leaves';
const tufts = new InstancedMesh(
  tuftGeometry,
  foliageDeep,
  tuftSites.length * TUFT_BLADES,
);
tufts.name = 'Grass tufts';

let trunkIndex = 0;
let frondIndex = 0;

palmSites.forEach(([x, z], i) => {
  // Tall enough that the crown clears a standing viewer by a good margin -
  // shorter than this and a palm reads as a potted plant, not a tree.
  const height = 3.4 + rand(i, 5.5) * 4.0;
  // Tilt of the whole trunk, in radians, pivoting about the foot.
  const lean = (rand(i, 8.2) - 0.5) * 0.2;
  // A 7 m palm on a 4 m palm's trunk reads as a bare dowel. Girth and crown
  // both track height, so tall trees stay in proportion instead of thinning
  // into poles with a tuft on top.
  const girth = 0.78 + (height / 7.4) * 0.5;
  root.position.set(x, 0, z);
  // Yaw spins the whole tree; the Z tilt then leans it in that direction.
  root.rotation.set(0, rand(i, 12.4) * Math.PI * 2, lean);

  limb.position.set(0, 0, 0);
  limb.rotation.set(0, 0, 0);
  limb.scale.set(
    TRUNK_BASE_RADIUS * girth,
    height,
    TRUNK_BASE_RADIUS * girth,
  );
  crown.position.set(0, 0, 0);
  crown.rotation.set(0, 0, 0);
  root.updateWorldMatrix(false, true);
  trunks.setMatrixAt(trunkIndex, limb.matrixWorld);
  trunkIndex += 1;

  crown.position.set(0, height, 0);
  crown.rotation.set(0, 0, 0);
  for (let f = 0; f < FRONDS; f += 1) {
    // Three droop bands: two arching out, one nearly horizontal, one young and
    // still upright. A single droop angle gives every palm the same umbrella.
    const band = f % 4;
    const droop = band === 0 ? 0.1 : band === 1 ? 0.42 : band === 2 ? 0.72 : 0.98;
    limb.position.set(0, 0, 0);
    limb.rotation.set(
      -Math.PI / 2 - droop,
      (f / FRONDS) * Math.PI * 2 + rand(i, f + 3) * 0.3,
      0,
    );
    const spread = (0.85 + rand(i * 31 + f, 2.2) * 0.4) * girth * 1.15;
    limb.scale.set(spread * 0.9, spread, 1);
    root.updateWorldMatrix(false, true);
    fronds.setMatrixAt(frondIndex, limb.matrixWorld);
    frondIndex += 1;
  }
});

let shrubIndex = 0;
shrubSites.forEach(([x, z], i) => {
  const size = 0.95 + rand(i, 23.3) * 0.8;
  root.position.set(x, 0, z);
  root.rotation.set(0, rand(i, 41.9) * Math.PI * 2, 0);
  crown.position.set(0, 0, 0);
  crown.rotation.set(0, 0, 0);

  for (let l = 0; l < SHRUB_LEAVES; l += 1) {
    // Alternating pitch gives the clump an interior instead of a flat rosette.
    const pitch = l % 2 === 0 ? 1.34 : 1.06;
    limb.position.set(0, 0.04, 0);
    limb.rotation.set(
      -Math.PI / 2 + pitch,
      (l / SHRUB_LEAVES) * Math.PI * 2 + rand(i, l) * 0.4,
      0,
    );
    limb.scale.setScalar(size * (0.8 + rand(i * 7 + l, 5.2) * 0.4));
    root.updateWorldMatrix(false, true);
    shrubs.setMatrixAt(shrubIndex, limb.matrixWorld);
    shrubIndex += 1;
  }
});

let tuftIndex = 0;
tuftSites.forEach(([x, z], i) => {
  const size = 0.6 + rand(i, 8.8) * 0.55;
  root.position.set(x, 0, z);
  root.rotation.set(0, rand(i, 55.1) * Math.PI * 2, 0);
  crown.position.set(0, 0, 0);
  crown.rotation.set(0, 0, 0);

  for (let b = 0; b < TUFT_BLADES; b += 1) {
    limb.position.set(0, 0, 0);
    limb.rotation.set(
      rand(i * 13 + b, 2.9) * 0.3,
      (b / TUFT_BLADES) * Math.PI * 2 + rand(i, b) * 0.6,
      0,
    );
    limb.scale.setScalar(size * (0.7 + rand(i * 5 + b, 9.4) * 0.6));
    root.updateWorldMatrix(false, true);
    tufts.setMatrixAt(tuftIndex, limb.matrixWorld);
    tuftIndex += 1;
  }
});

// An InstancedMesh frustum-culls against its OWN bounding sphere, and that
// sphere is null until this is called - at which point Three falls back to the
// base geometry's, a sphere around a single leaf at the origin. The frond mesh
// was therefore culled from most viewpoints while the trunk mesh (a unit
// cylinder, so a far larger fallback sphere) survived: whole groves rendered as
// bare poles. Computing the real sphere fixes it and keeps culling working.
trunks.instanceMatrix.needsUpdate = true;
fronds.instanceMatrix.needsUpdate = true;
shrubs.instanceMatrix.needsUpdate = true;
tufts.instanceMatrix.needsUpdate = true;
trunks.computeBoundingSphere();
fronds.computeBoundingSphere();
shrubs.computeBoundingSphere();
tufts.computeBoundingSphere();
// Trunks cast; fronds do not. The crowns are ~1200 instanced leaves and their
// shadows are a faint dapple, but they were the largest single contributor to
// the shadow pass.
trunks.castShadow = true;

vegetation.add(trunks, fronds, shrubs, tufts);

export default vegetation;
