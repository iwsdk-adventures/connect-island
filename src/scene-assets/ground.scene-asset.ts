/**
 * The site floor: surrounding desert, a tiled plaza disc, an apron ring around
 * the pavilion, three radial paths out to the corners, and three perimeter
 * paths along the triangle edges.
 *
 * Every path is edged with a recessed light line. At dusk those strips are what
 * actually draw the triangular plan — the paving alone reads as one open field.
 *
 * Carries LocomotionEnvironment in scene JSON, so this is the walkable surface.
 */

import {
  BoxGeometry,
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
  ledBlue,
  ledCyan,
  outerTerrain,
  pathStone,
  shoreSand,
  sandGround,
  timberBoardwalk,
} from './palette.js';

const CORNERS = [
  SITE.corners.entrance,
  SITE.corners.stage,
  SITE.corners.firepit,
] as const;

// Perimeter runs span corner to corner so the walkway network is genuinely
// continuous. The corner decks overlap the ends, forming real junctions rather
// than relying on pale paving to imply a connection.
const EDGE_LENGTH = 24;
/** Parquet tile size, in metres, for every walkway. */
const WALK_TILE = 1.35;
// Short enough that the perimeter runs end before the radial runs reach the
// perimeter band. At 17.5 they crossed at roughly (+/-6.45, +/-5.47) on each
// edge; verified clear at 10.5.
const EDGE_LED_LENGTH = 12;
/**
 * Radial runs, as [start, end] radii. Each reaches its destination's own
 * decking: the entrance spoke runs all the way to the arrival court's ring
 * walk at 14.0, while the stage and firepit decks already begin around 8.2.
 */
const RADIAL_SPANS: ReadonlyArray<readonly [number, number]> = [
  [6.4, 14.6],
  [6.4, 9.8],
  [6.4, 9.8],
];
/** Light runs sit inside their path by this margin at both ends. */
const RADIAL_LED_INSET = 0.8;

/**
 * Bake tiling into a geometry's UVs so one material can serve runs of different
 * sizes at a constant tile. PlaneGeometry and RingGeometry both emit UVs in
 * 0..1 across their extent, so scaling by extent/tile gives square tiles.
 */
function tilePlanarUVs(
  geometry: PlaneGeometry | RingGeometry,
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

const ground = new Group();
ground.name = 'Site ground';

// The island. Its top sits just above the waterline and a flared skirt runs
// down to meet the sea, so the plaza ends on a shoreline rather than a rim.
const island = new Mesh(new CircleGeometry(46, 72), outerTerrain);
island.rotation.x = -Math.PI / 2;
island.position.y = -0.04;
island.name = 'Island';
ground.add(island);

const shore = new Mesh(
  new CylinderGeometry(46, 55, 2.4, 72, 1, true),
  shoreSand,
);
shore.position.y = -1.24;
shore.name = 'Shoreline';
ground.add(shore);

// Base plaza. CircleGeometry lies in XY facing +Z, so lay it flat.
const plaza = new Mesh(new CircleGeometry(SITE.groundRadius, 72), sandGround);
plaza.rotation.x = -Math.PI / 2;
plaza.name = 'Plaza';
ground.add(plaza);

// Apron ring under the pavilion roofline, with a light line at its outer edge.
const apronGeometry = new RingGeometry(4.9, 6.7, 72);
apronGeometry.rotateX(-Math.PI / 2);
const apron = new Mesh(apronGeometry, pathStone);
apron.position.y = 0.014;
apron.name = 'Pavilion apron';
ground.add(apron);

const apronLed = new Mesh(new TorusGeometry(6.72, 0.035, 6, 96), ledBlue);
apronLed.rotation.x = -Math.PI / 2;
apronLed.position.y = 0.035;
apronLed.name = 'Apron light line';
ground.add(apronLed);

/** Lay a pair of recessed light lines either side of a path. */
function addEdgeLights(
  geometry: BoxGeometry,
  centreX: number,
  centreZ: number,
  yaw: number,
  offset: number,
  label: string,
): void {
  // Local +X rotated by yaw gives the across-path direction.
  const acrossX = Math.cos(yaw);
  const acrossZ = -Math.sin(yaw);
  for (const side of [-1, 1]) {
    const strip = new Mesh(geometry, ledCyan);
    strip.position.set(
      centreX + acrossX * offset * side,
      0.045,
      centreZ + acrossZ * offset * side,
    );
    strip.rotation.y = yaw;
    strip.name = `${label} light ${side < 0 ? 'a' : 'b'}`;
    ground.add(strip);
  }
}

// Perimeter paths — the three triangle edges. Shared geometry across all three.
const edgeGeometry = new PlaneGeometry(2.8, EDGE_LENGTH);
tilePlanarUVs(edgeGeometry, 2.8, EDGE_LENGTH, WALK_TILE);
edgeGeometry.rotateX(-Math.PI / 2);
const edgeLedGeometry = new BoxGeometry(0.07, 0.05, EDGE_LED_LENGTH);
for (let i = 0; i < CORNERS.length; i += 1) {
  const [ax, az] = CORNERS[i];
  const [bx, bz] = CORNERS[(i + 1) % CORNERS.length];
  const midX = (ax + bx) / 2;
  const midZ = (az + bz) / 2;
  const yaw = Math.atan2(bx - ax, bz - az);

  const edge = new Mesh(edgeGeometry, timberBoardwalk);
  edge.position.set(midX, 0.02, midZ);
  edge.rotation.y = yaw;
  edge.name = `Edge path ${i}`;
  ground.add(edge);

  addEdgeLights(edgeLedGeometry, midX, midZ, yaw, 1.46, `Edge ${i}`);
}

// Radial paths — pavilion apron out to each destination's decking.
const padGeometry = new RingGeometry(0, 6.4, 56);
padGeometry.rotateX(-Math.PI / 2);

for (let i = 0; i < CORNERS.length; i += 1) {
  const [cx, cz] = CORNERS[i];
  const dirX = cx / SITE.cornerRadius;
  const dirZ = cz / SITE.cornerRadius;
  const yaw = Math.atan2(cx, cz);
  const [spanStart, spanEnd] = RADIAL_SPANS[i];
  const spanLength = spanEnd - spanStart;
  const spanCentre = (spanStart + spanEnd) / 2;

  const radialGeometry = new PlaneGeometry(2.9, spanLength);
  tilePlanarUVs(radialGeometry, 2.9, spanLength, WALK_TILE);
  radialGeometry.rotateX(-Math.PI / 2);

  const spoke = new Mesh(radialGeometry, timberBoardwalk);
  spoke.position.set(dirX * spanCentre, 0.028, dirZ * spanCentre);
  spoke.rotation.y = yaw;
  spoke.name = `Radial path ${i}`;
  ground.add(spoke);

  const ledLength = Math.max(spanLength - RADIAL_LED_INSET * 2, 0.6);
  const radialLedGeometry = new BoxGeometry(0.07, 0.05, ledLength);
  addEdgeLights(
    radialLedGeometry,
    dirX * spanCentre,
    dirZ * spanCentre,
    yaw,
    1.51,
    `Radial ${i}`,
  );

  const pad = new Mesh(padGeometry, pathStone);
  pad.position.set(cx, 0.016, cz);
  pad.name = `Corner pad ${i}`;
  ground.add(pad);

}

/* --------------------------------------------------------- arrival court */

// A circular court around the entrance sculpture. Visitors spawn on its far
// side, walk around the piece, and carry on down the boardwalk to the pavilion,
// so the sculpture is something you circle rather than something in the way.
const ARRIVAL_Z = 18.5;
const COURT_RADIUS = 5.4;

const courtGeometry = new RingGeometry(0, COURT_RADIUS, 56);
courtGeometry.rotateX(-Math.PI / 2);
const court = new Mesh(courtGeometry, pathStone);
court.position.set(0, 0.018, ARRIVAL_Z);
court.name = 'Arrival court';
ground.add(court);

// Ring of decking you actually walk on, clear of the plinth at the centre.
const courtRingGeometry = new RingGeometry(1.5, 4.5, 56);
tilePlanarUVs(courtRingGeometry, 9, 9, WALK_TILE);
courtRingGeometry.rotateX(-Math.PI / 2);
const courtRing = new Mesh(courtRingGeometry, timberBoardwalk);
courtRing.position.set(0, 0.03, ARRIVAL_Z);
courtRing.name = 'Arrival ring walk';
ground.add(courtRing);

for (const ringRadius of [1.44, 4.56]) {
  const ringLed = new Mesh(new TorusGeometry(ringRadius, 0.03, 6, 64), ledCyan);
  ringLed.rotation.x = -Math.PI / 2;
  ringLed.position.set(0, 0.046, ARRIVAL_Z);
  ringLed.name = `Court light ring ${ringRadius}`;
  ground.add(ringLed);
}

export default ground;
