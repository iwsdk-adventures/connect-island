/**
 * The site floor.
 *
 * The plan is a rounded triangle: a circle at each corner, joined by straight
 * edge decks whose OUTER edge is tangent to both circles. That tangency is the
 * whole trick — it makes the outer silhouette read arc, straight, arc, with no
 * concave junction where a deck meets a circle.
 *
 * Inside that ring sits a moat. The sand island is a RingGeometry with a hole
 * of `moatOuterRadius`, and the hole is filled by the moat's rock bed and
 * water. The lip is deliberately at 13.0 m, which falls between the edge decks'
 * inner (11.65) and outer (14.45) edges — so the moat runs underneath them and
 * they read as decks over water rather than as paving.
 *
 * Every walking surface is therefore a deck: a tiled top plane on a visible
 * structural slab, sitting clear above the waterline. The three radial runs are
 * bridges in the same construction.
 *
 * Carries LocomotionEnvironment in scene JSON, so this is the walkable surface.
 */

import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  RingGeometry,
  TorusGeometry,
} from '@iwsdk/core';
import {
  SITE,
  deckStructure,
  ledCyan,
  moatRock,
  moatRockWall,
  outerTerrain,
  pathStone,
  sandGround,
  shadowReceiver,
  shoreSand,
  timberBoardwalk,
} from './palette.js';
import { waterMaterial } from './water.scene-asset.js';

const CORNERS = [
  SITE.corners.entrance,
  SITE.corners.stage,
  SITE.corners.firepit,
] as const;

const DECK_TOP = SITE.deckTop;
const DECK_BOTTOM = SITE.deckTop - SITE.deckThickness;
/**
 * Surfaces that overlap in plan are separated by multiples of this. Coplanar
 * faces at 20-40 m read as moire banding long before they read as z-fighting,
 * and the two worst offenders were the deck slab's top face (exactly at deck
 * level, under the deck surface) and the corner circles (exactly at deck level,
 * over every deck end). One rung apart is invisible and settles both.
 */
const SHIM = 0.008;
/** Parquet tile size, in metres, for every walkway. */
const WALK_TILE = 1.35;
/** Bridges run from just inside the island edge to just inside each circle. */
const BRIDGE_SPAN: readonly [number, number] = [6.9, 10.7];

const ground = new Group();
ground.name = 'Site ground';

/**
 * Bake tiling into a geometry's UVs so one material serves runs of any size at
 * a constant tile. Plane, Ring and Circle all emit UVs across 0..1.
 */
function tilePlanarUVs(
  geometry: PlaneGeometry | RingGeometry | CircleGeometry,
  width: number,
  length: number,
  tile: number,
): void {
  const uv = geometry.attributes.uv;
  const su = width / tile;
  const sv = length / tile;
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  }
  uv.needsUpdate = true;
}

/**
 * Top surface of a deck, as a trapezoid in local XZ.
 *
 * `width` runs along local X and `length` along local Z, but the two long edges
 * can have different lengths: the outer edge runs the full span while the inner
 * edge is pulled back by `endInset` at both ends. That is what removes the
 * concave notch where an edge deck meets a corner circle.
 *
 * With the outer edge tangent to both circles, a plain rectangle's inner
 * corners land outside the circle it is supposed to disappear into, and those
 * corners are exactly the bites out of the outer silhouette. Insetting the
 * inner edge by sqrt(r^2 - d^2) - where d is the inner edge's offset from the
 * circle centre - puts both end corners on the circle, so the end cut is a
 * chord and the circle covers it.
 */
function trapezoidTop(
  width: number,
  length: number,
  endInset: number,
  outerSign: number,
): BufferGeometry {
  const xOuter = (outerSign * width) / 2;
  const xInner = (-outerSign * width) / 2;
  const half = length / 2;
  const halfInner = half - endInset;

  // Quad corners, ordered so the two triangles wind counter-clockwise seen from
  // above (+Y), which is what an upward-facing surface needs.
  const quad: Array<[number, number]> = [
    [xOuter, -half],
    [xOuter, half],
    [xInner, halfInner],
    [xInner, -halfInner],
  ];

  const positions = new Float32Array(12);
  const normals = new Float32Array(12);
  const uvs = new Float32Array(8);
  quad.forEach(([x, z], i) => {
    positions[i * 3] = x;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = z;
    normals[i * 3 + 1] = 1;
    // Planar UVs in metres; scaled to the tile below, as for every other walk.
    uvs[i * 2] = x / WALK_TILE;
    uvs[i * 2 + 1] = z / WALK_TILE;
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  // Indexed, and it has to be: LocomotionEnvironment merges every geometry
  // under the node with BufferGeometryUtils.mergeGeometries, which rejects the
  // whole batch unless all of them agree on both the index and the attribute
  // set. One non-indexed surface here silently disabled collision for the
  // entire site - the console said so, the scene did not.
  geometry.setIndex(
    outerSign > 0 ? [0, 3, 2, 0, 2, 1] : [0, 1, 2, 0, 2, 3],
  );
  return geometry;
}

/**
 * A deck: tiled top surface on a structural slab, with light lines down the
 * long edges. `width` runs along local X, `length` along local Z.
 *
 * `endInset` tapers the inner edge (see trapezoidTop); pass 0 for a rectangle.
 * `outerSign` says which local X face is the outer one.
 */
function addDeck(
  width: number,
  length: number,
  x: number,
  z: number,
  yaw: number,
  label: string,
  lightInset: number,
  endInset = 0,
  outerSign = 1,
): void {
  const top =
    endInset > 0
      ? trapezoidTop(width, length, endInset, outerSign)
      : (() => {
          const plane = new PlaneGeometry(width, length);
          tilePlanarUVs(plane, width, length, WALK_TILE);
          plane.rotateX(-Math.PI / 2);
          return plane;
        })();
  const surface = new Mesh(top, timberBoardwalk);
  surface.position.set(x, DECK_TOP, z);
  surface.rotation.y = yaw;
  surface.name = `${label} surface`;
  ground.add(surface);

  // Slab below, so the deck shows thickness where it crosses the water. Its top
  // face sits one shim under the walking surface rather than in the same plane.
  const slabLength = length - endInset * 2;
  const slab = new Mesh(
    new BoxGeometry(width - 0.12, SITE.deckThickness, slabLength),
    deckStructure,
  );
  slab.position.set(x, DECK_TOP - SHIM - SITE.deckThickness / 2, z);
  slab.rotation.y = yaw;
  slab.name = `${label} structure`;
  ground.add(slab);

  const stripGeometry = new BoxGeometry(0.07, 0.05, slabLength - 1.2);
  const acrossX = Math.cos(yaw);
  const acrossZ = -Math.sin(yaw);
  for (const side of [-1, 1]) {
    const strip = new Mesh(stripGeometry, ledCyan);
    strip.position.set(
      x + acrossX * lightInset * side,
      DECK_TOP + 0.025,
      z + acrossZ * lightInset * side,
    );
    strip.rotation.y = yaw;
    strip.name = `${label} light ${side < 0 ? 'a' : 'b'}`;
    ground.add(strip);
  }
}

/* ------------------------------------------------------------------ island */

// Sand, with a hole for the moat. Everything inside the hole is deck or water.
const islandGeometry = new RingGeometry(SITE.moatOuterRadius, SITE.groundRadius, 96, 1);
islandGeometry.rotateX(-Math.PI / 2);
const island = new Mesh(islandGeometry, outerTerrain);
island.position.y = -0.04;
island.name = 'Island';
ground.add(island);

const shore = new Mesh(
  new CylinderGeometry(SITE.groundRadius, SITE.groundRadius + 9, 2.4, 72, 1, true),
  shoreSand,
);
shore.position.y = -1.24;
shore.name = 'Shoreline';
ground.add(shore);

/* -------------------------------------------------------------------- moat */

const moatBed = new Mesh(new CircleGeometry(SITE.moatOuterRadius, 80), moatRock);
moatBed.rotation.x = -Math.PI / 2;
moatBed.position.y = SITE.moatBedY;
moatBed.name = 'Moat bed';
ground.add(moatBed);

// Revetment holding the sand back from the water.
const moatWall = new Mesh(
  new CylinderGeometry(
    SITE.moatOuterRadius,
    SITE.moatOuterRadius,
    Math.abs(SITE.moatBedY) + 0.1,
    80,
    1,
    true,
  ),
  moatRockWall,
);
moatWall.position.y = SITE.moatBedY / 2;
moatWall.name = 'Moat revetment';
ground.add(moatWall);

// Same water material as the sea, so both surfaces share one shader.
const moatWaterGeometry = new RingGeometry(
  SITE.islandRadius - 0.35,
  SITE.moatOuterRadius + 0.05,
  80,
  1,
);
moatWaterGeometry.rotateX(-Math.PI / 2);
const moatWater = new Mesh(moatWaterGeometry, waterMaterial);
moatWater.position.y = SITE.moatWaterY;
moatWater.name = 'Moat water';
ground.add(moatWater);

/* ----------------------------------------------------------- centre island */

const platform = new Mesh(new CircleGeometry(SITE.islandRadius, 72), sandGround);
platform.rotation.x = -Math.PI / 2;
platform.name = 'Pavilion platform';
ground.add(platform);

const platformWall = new Mesh(
  new CylinderGeometry(
    SITE.islandRadius,
    SITE.islandRadius + 0.25,
    Math.abs(SITE.moatBedY),
    72,
    1,
    true,
  ),
  moatRockWall,
);
platformWall.position.y = SITE.moatBedY / 2;
platformWall.name = 'Platform revetment';
ground.add(platformWall);

const apronGeometry = new RingGeometry(4.9, 6.9, 72);
apronGeometry.rotateX(-Math.PI / 2);
const apron = new Mesh(apronGeometry, pathStone);
apron.position.y = 0.014;
apron.name = 'Pavilion apron';
ground.add(apron);

const apronLed = new Mesh(new TorusGeometry(6.92, 0.035, 6, 96), ledCyan);
apronLed.rotation.x = -Math.PI / 2;
apronLed.position.y = 0.035;
apronLed.name = 'Apron light line';
ground.add(apronLed);

/* ---------------------------------------------------------- corner circles */

const circleGeometry = new CircleGeometry(SITE.cornerCircleRadius, 72);
circleGeometry.rotateX(-Math.PI / 2);
const circleSkirtGeometry = new CylinderGeometry(
  SITE.cornerCircleRadius,
  SITE.cornerCircleRadius,
  0.66,
  72,
  1,
  true,
);
const circleLedGeometry = new TorusGeometry(
  SITE.cornerCircleRadius - 0.06,
  0.03,
  6,
  80,
);

for (let i = 0; i < CORNERS.length; i += 1) {
  const [cx, cz] = CORNERS[i];

  const circle = new Mesh(circleGeometry, pathStone);
  circle.position.set(cx, DECK_TOP + SHIM, cz);
  circle.name = `Corner circle ${i}`;
  ground.add(circle);

  // Reads as a platform standing out of the water on the moat side.
  const skirt = new Mesh(circleSkirtGeometry, deckStructure);
  skirt.position.set(cx, DECK_TOP - SHIM - 0.33, cz);
  skirt.name = `Corner skirt ${i}`;
  ground.add(skirt);

  const rim = new Mesh(circleLedGeometry, ledCyan);
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(cx, DECK_TOP + SHIM + 0.02, cz);
  rim.name = `Corner light ring ${i}`;
  ground.add(rim);
}

// Ring walk around the entrance sculpture.
const ringWalkGeometry = new RingGeometry(1.5, 4.6, 64, 1);
tilePlanarUVs(ringWalkGeometry, 9.2, 9.2, WALK_TILE);
ringWalkGeometry.rotateX(-Math.PI / 2);
const ringWalk = new Mesh(ringWalkGeometry, timberBoardwalk);
ringWalk.position.set(
  SITE.corners.entrance[0],
  DECK_TOP + SHIM * 2,
  SITE.corners.entrance[1],
);
ringWalk.name = 'Arrival ring walk';
ground.add(ringWalk);

/* -------------------------------------------------------------- edge decks */

// Pushed out so the outer edge is tangent to both circles it runs between.
const edgePush = SITE.cornerCircleRadius - SITE.edgeWidth / 2;
const edgeLength = SITE.cornerRadius * Math.sqrt(3);

/**
 * How far the inner edge falls short at each end. The inner edge is offset
 * `edgeWidth` inwards from the tangent line, so it sits that far in from the
 * circle's outermost point; the circle is still that wide at +/- this much
 * either side of the corner. Both end corners therefore land on the circle.
 */
const edgeEndInset = Math.sqrt(
  SITE.cornerCircleRadius * SITE.cornerCircleRadius -
    (SITE.cornerCircleRadius - SITE.edgeWidth) *
      (SITE.cornerCircleRadius - SITE.edgeWidth),
);

for (let i = 0; i < CORNERS.length; i += 1) {
  const [ax, az] = CORNERS[i];
  const [bx, bz] = CORNERS[(i + 1) % CORNERS.length];
  const midX = (ax + bx) / 2;
  const midZ = (az + bz) / 2;
  const away = Math.hypot(midX, midZ);

  addDeck(
    SITE.edgeWidth,
    edgeLength,
    midX + (midX / away) * edgePush,
    midZ + (midZ / away) * edgePush,
    Math.atan2(bx - ax, bz - az),
    `Edge deck ${i}`,
    SITE.edgeWidth / 2 - 0.22,
    // Local +X points inwards for this yaw convention, so the outer face is -X.
    edgeEndInset,
    -1,
  );
}

/* ----------------------------------------------------------------- bridges */

const bridgeLength = BRIDGE_SPAN[1] - BRIDGE_SPAN[0];
const bridgeCentre = (BRIDGE_SPAN[0] + BRIDGE_SPAN[1]) / 2;

for (let i = 0; i < CORNERS.length; i += 1) {
  const [cx, cz] = CORNERS[i];
  const dirX = cx / SITE.cornerRadius;
  const dirZ = cz / SITE.cornerRadius;

  addDeck(
    SITE.bridgeWidth,
    bridgeLength,
    dirX * bridgeCentre,
    dirZ * bridgeCentre,
    Math.atan2(cx, cz),
    `Bridge ${i}`,
    SITE.bridgeWidth / 2 - 0.22,
  );
}

export default shadowReceiver(ground);
