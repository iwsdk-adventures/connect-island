/**
 * The firepit: a timber lounge deck, a low bronze bowl with a slim chrome edge,
 * a lit gas ring over fire glass, and a cluster of flame tongues.
 *
 * The flame is six overlapping lathed tongues at varied scale, height and yaw
 * rather than one cone. A single cone — at any opacity — has a hard straight
 * silhouette that reads as a glass prism; only overlapping irregular shapes
 * break that outline up.
 *
 * Every sheet carries its own size, rate and phase in userData, and the system
 * animates each one separately. Scaling the whole group together - which is what
 * this did first - moves every tongue in lockstep and reads as one object
 * breathing rather than as fire.
 *
 * Above the tongues is an instanced swarm of embers. Their motion is a pure
 * function of time and instance index, so the swarm needs no per-particle state
 * and no allocation per frame.
 *
 * The tongues live under a group named 'FlameGroup' and the swarm is named
 * 'EmberSwarm', so FirePitSystem can find them without knowing the hierarchy.
 */

import {
  CircleGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  PlaneGeometry,
  Mesh,
  SphereGeometry,
  TorusGeometry,
} from '@iwsdk/core';
import {
  brushedChrome,
  creamShell,
  darkStone,
  emberBed,
  emberSpark,
  flameCoreMaterial,
  flameMaterial,
  graphite,
  ledCyan,
  ledWarm,
  shadowProp,
  terracottaDeep,
  timberDeckWide,
} from './palette.js';

const DECK_TOP = 0.22;
const BOWL_TOP = 0.74;

const firepit = new Group();
firepit.name = 'Firepit';

/* -------------------------------------------------------------------- deck */

const deck = new Mesh(new CylinderGeometry(5.4, 5.65, 0.22, 56), creamShell);
deck.position.y = 0.11;
deck.name = 'Lounge deck';
firepit.add(deck);

const deckSkirt = new Mesh(new CylinderGeometry(5.5, 5.62, 0.14, 56), graphite);
deckSkirt.position.y = 0.05;
deckSkirt.name = 'Lounge deck skirt';
firepit.add(deckSkirt);

const deckBoards = new Mesh(new CircleGeometry(5.4, 56), timberDeckWide);
deckBoards.rotation.x = -Math.PI / 2;
deckBoards.position.y = DECK_TOP + 0.002;
deckBoards.name = 'Lounge deck boards';
firepit.add(deckBoards);

const deckRim = new Mesh(new TorusGeometry(5.42, 0.09, 10, 56), terracottaDeep);
deckRim.rotation.x = -Math.PI / 2;
deckRim.position.y = DECK_TOP;
deckRim.name = 'Lounge deck rim';
firepit.add(deckRim);

const deckLed = new Mesh(new TorusGeometry(5.46, 0.032, 6, 72), ledCyan);
deckLed.rotation.x = -Math.PI / 2;
deckLed.position.y = DECK_TOP - 0.09;
deckLed.name = 'Deck light line';
firepit.add(deckLed);

/* -------------------------------------------------------------------- bowl */

// Low and wide, so it never blocks the sightline across the circle from a seat.
const bowl = new Mesh(
  new CylinderGeometry(1.36, 1.18, BOWL_TOP - DECK_TOP, 44),
  darkStone,
);
bowl.position.y = DECK_TOP + (BOWL_TOP - DECK_TOP) / 2;
bowl.name = 'Fire bowl';
firepit.add(bowl);

const bowlBand = new Mesh(new TorusGeometry(1.28, 0.035, 8, 44), brushedChrome);
bowlBand.rotation.x = -Math.PI / 2;
bowlBand.position.y = DECK_TOP + 0.16;
bowlBand.name = 'Fire bowl band';
firepit.add(bowlBand);

// Slim edge — a fat torus here read as an inflatable ring.
const bowlRim = new Mesh(new TorusGeometry(1.36, 0.05, 10, 48), brushedChrome);
bowlRim.rotation.x = -Math.PI / 2;
bowlRim.position.y = BOWL_TOP;
bowlRim.name = 'Fire bowl rim';
firepit.add(bowlRim);

const embers = new Mesh(new CircleGeometry(1.28, 40), emberBed);
embers.rotation.x = -Math.PI / 2;
embers.position.y = BOWL_TOP - 0.12;
embers.name = 'Ember bed';
firepit.add(embers);

const gasRing = new Mesh(new TorusGeometry(0.66, 0.028, 8, 36), ledWarm);
gasRing.rotation.x = -Math.PI / 2;
gasRing.position.y = BOWL_TOP - 0.09;
gasRing.name = 'Gas ring';
firepit.add(gasRing);

// Fire glass on the bed. Deterministic scatter, jittered by index.
const glassLumpGeometry = new SphereGeometry(0.1, 8, 6);
for (let i = 0; i < 20; i += 1) {
  const angle = (i / 20) * Math.PI * 2 + (i % 3) * 0.18;
  const radius = 0.42 + ((i * 7) % 6) * 0.13;
  const lump = new Mesh(glassLumpGeometry, graphite);
  lump.position.set(
    Math.sin(angle) * radius,
    BOWL_TOP - 0.13,
    Math.cos(angle) * radius,
  );
  lump.scale.set(1, 0.55 + ((i * 3) % 4) * 0.12, 1);
  lump.name = `Fire glass ${i}`;
  firepit.add(lump);
}

/* ------------------------------------------------------------------ flames */

const flames = new Group();
flames.name = 'FlameGroup';
flames.position.y = BOWL_TOP - 0.12;
firepit.add(flames);

// Crossed quads carrying the alpha ramp. Three planes at 60 degrees keep the
// flame readable from any approach without ever showing an edge.
const flameQuad = new PlaneGeometry(1, 1);
flameQuad.translate(0, 0.5, 0);

// Rates are deliberately incommensurate. Any two tongues on rates with a simple
// ratio visibly re-sync every couple of seconds, which is the tell.
const SHEETS = [
  { w: 1.66, h: 0.92, yaw: 0.0, core: false, rate: 3.1, phase: 0.0 },
  { w: 1.42, h: 1.1, yaw: 1.05, core: false, rate: 4.3, phase: 1.7 },
  { w: 1.54, h: 0.82, yaw: 2.1, core: false, rate: 3.7, phase: 3.4 },
  { w: 1.18, h: 1.24, yaw: 2.7, core: false, rate: 5.2, phase: 0.9 },
  { w: 0.86, h: 0.64, yaw: 0.5, core: true, rate: 6.7, phase: 2.2 },
  { w: 0.72, h: 0.78, yaw: 1.6, core: true, rate: 7.9, phase: 5.1 },
  { w: 0.58, h: 0.52, yaw: 2.9, core: true, rate: 9.1, phase: 4.0 },
];

SHEETS.forEach((sheet, index) => {
  const mesh = new Mesh(
    flameQuad,
    sheet.core ? flameCoreMaterial : flameMaterial,
  );
  mesh.scale.set(sheet.w, sheet.h, 1);
  mesh.rotation.y = sheet.yaw;
  mesh.name = `Flame sheet ${index}`;
  // Cloned with the mesh, so each placement animates the same way.
  mesh.userData.flame = {
    w: sheet.w,
    h: sheet.h,
    rate: sheet.rate,
    phase: sheet.phase,
  };
  flames.add(mesh);
});

/* ------------------------------------------------------------------ embers */

/** Sparks in the swarm. One draw call regardless. */
export const EMBER_COUNT = 34;

const embersSwarm = new InstancedMesh(
  new SphereGeometry(0.035, 5, 4),
  emberSpark,
  EMBER_COUNT,
);
embersSwarm.name = 'EmberSwarm';
embersSwarm.position.y = BOWL_TOP - 0.1;
// Sparks are never in the same place twice; a stale bounding sphere would cull
// the whole swarm as soon as it drifted off the origin.
embersSwarm.frustumCulled = false;
firepit.add(embersSwarm);

export default shadowProp(firepit);
