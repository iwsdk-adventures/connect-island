/**
 * The firepit: a timber lounge deck, a low bronze bowl with a slim chrome edge,
 * a lit gas ring over fire glass, and a cluster of flame tongues.
 *
 * The flame is six overlapping lathed tongues at varied scale, height and yaw
 * rather than one cone. A single cone — at any opacity — has a hard straight
 * silhouette that reads as a glass prism; only overlapping irregular shapes
 * break that outline up.
 *
 * The tongues live under a group named 'FlameGroup' so FirePitSystem can find
 * and animate them without knowing the rest of the hierarchy.
 */

import {
  CircleGeometry,
  CylinderGeometry,
  Group,
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
  flameCoreMaterial,
  flameMaterial,
  graphite,
  ledCyan,
  ledWarm,
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

const SHEETS = [
  { w: 1.66, h: 0.92, yaw: 0.0, core: false },
  { w: 1.42, h: 1.1, yaw: 1.05, core: false },
  { w: 1.54, h: 0.82, yaw: 2.1, core: false },
  { w: 0.86, h: 0.64, yaw: 0.5, core: true },
  { w: 0.72, h: 0.78, yaw: 1.6, core: true },
];

SHEETS.forEach((sheet, index) => {
  const mesh = new Mesh(
    flameQuad,
    sheet.core ? flameCoreMaterial : flameMaterial,
  );
  mesh.scale.set(sheet.w, sheet.h, 1);
  mesh.rotation.y = sheet.yaw;
  mesh.name = `Flame sheet ${index}`;
  flames.add(mesh);
});

export default firepit;
