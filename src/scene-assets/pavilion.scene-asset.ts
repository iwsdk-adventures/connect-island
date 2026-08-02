/**
 * The central pavilion: a raised plaster deck, eight rounded columns with metal
 * collars, glazed bays on four of the eight structural bays, a lathed saucer
 * canopy with radial ribs and a violet fascia band, and three curved backing
 * walls that the UIKitML info panels mount against.
 *
 * The walls and the four open bays face the three site corners (yaw 0, 120,
 * 240), so each approach arrives at a clear entry and a reading station rather
 * than at glazing or the back of a panel.
 */

import {
  CircleGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  RingGeometry,
  TorusGeometry,
  Vector2,
} from '@iwsdk/core';
import {
  arcWallGeometry,
  brandBlueGlow,
  brandDeepBlue,
  brandVioletTwoSided,
  brushedChrome,
  creamLight,
  creamLightTwoSided,
  creamShade,
  creamShell,
  glassPanel,
  graphite,
  ledBlue,
  ledCyan,
  ledWarm,
  polishedSteel,
  shadowProp,
  timberDark,
  timberDarkTwoSided,
  timberDeck,
  timberWall,
} from './palette.js';

const DECK_TOP = 0.3;
const COLUMN_TOP = 4.0;
const ROOF_ORIGIN_Y = 4.15;
const WALL_RADIUS = 2.9;
const COLUMN_RADIUS = 4.6;
const BAY_COUNT = 6;

/**
 * Six bays put a bay centre on each of the three approach axes (0, 120, 240)
 * and a column on neither, so no column ever stands in front of an info panel.
 * Those three bays stay open; the alternating three are glazed.
 */
const OPEN_BAYS = new Set([0, 2, 4]);

const pavilion = new Group();
pavilion.name = 'Pavilion';

/* ------------------------------------------------------------------- deck */

const skirt = new Mesh(new CylinderGeometry(5.62, 5.72, 0.1, 64), graphite);
skirt.position.y = 0.05;
skirt.name = 'Pavilion skirt';
pavilion.add(skirt);

const lowerStep = new Mesh(new CylinderGeometry(5.55, 5.75, 0.16, 64), creamShell);
lowerStep.position.y = 0.08;
lowerStep.name = 'Pavilion step';
pavilion.add(lowerStep);

const deck = new Mesh(new CylinderGeometry(5.0, 5.2, 0.3, 64), creamShell);
deck.position.y = 0.15;
deck.name = 'Pavilion deck';
pavilion.add(deck);

// Timber deck surface laid over the plaster kerb.
const deckBoards = new Mesh(new CircleGeometry(5.0, 64), timberDeck);
deckBoards.rotation.x = -Math.PI / 2;
deckBoards.position.y = DECK_TOP + 0.002;
deckBoards.name = 'Deck boards';
pavilion.add(deckBoards);

// Recessed light line around the deck nosing.
const deckLed = new Mesh(new TorusGeometry(5.04, 0.035, 6, 80), ledBlue);
deckLed.rotation.x = -Math.PI / 2;
deckLed.position.y = DECK_TOP - 0.06;
deckLed.name = 'Deck light line';
pavilion.add(deckLed);

// Brand medallion inlaid in the deck, ringed by two concentric light inlays.
const medallion = new Mesh(new CylinderGeometry(1.7, 1.7, 0.05, 48), brandDeepBlue);
medallion.position.y = DECK_TOP + 0.005;
medallion.name = 'Deck medallion';
pavilion.add(medallion);

const medallionRing = new Mesh(new TorusGeometry(1.72, 0.05, 10, 48), brandBlueGlow);
medallionRing.rotation.x = -Math.PI / 2;
medallionRing.position.y = DECK_TOP + 0.02;
medallionRing.name = 'Deck medallion ring';
pavilion.add(medallionRing);

for (const inlayRadius of [2.6, 3.6]) {
  const inlay = new Mesh(new TorusGeometry(inlayRadius, 0.022, 6, 72), ledCyan);
  inlay.rotation.x = -Math.PI / 2;
  inlay.position.y = DECK_TOP + 0.012;
  inlay.name = `Deck inlay ${inlayRadius}`;
  pavilion.add(inlay);
}

/* ---------------------------------------------------------------- columns */

const columnHeight = COLUMN_TOP - DECK_TOP;
const columnGeometry = new CylinderGeometry(0.19, 0.23, columnHeight, 20);
const collarGeometry = new CylinderGeometry(0.27, 0.27, 0.14, 20);
const capitalGeometry = new CylinderGeometry(0.3, 0.24, 0.18, 20);

for (let i = 0; i < BAY_COUNT; i += 1) {
  const angle = ((i + 0.5) / BAY_COUNT) * Math.PI * 2;
  const x = Math.sin(angle) * COLUMN_RADIUS;
  const z = Math.cos(angle) * COLUMN_RADIUS;

  const column = new Mesh(columnGeometry, creamLight);
  column.position.set(x, DECK_TOP + columnHeight / 2, z);
  column.name = `Column ${i}`;
  pavilion.add(column);

  const collar = new Mesh(collarGeometry, brushedChrome);
  collar.position.set(x, DECK_TOP + 0.24, z);
  collar.name = `Column collar ${i}`;
  pavilion.add(collar);

  const capital = new Mesh(capitalGeometry, brushedChrome);
  capital.position.set(x, COLUMN_TOP - 0.1, z);
  capital.name = `Column capital ${i}`;
  pavilion.add(capital);
}

/* ------------------------------------------------------------------ glazing */

// One glass leaf per closed bay, spanning the gap between adjacent columns.
const bayStep = (Math.PI * 2) / BAY_COUNT;
const glassGeometry = arcWallGeometry(
  COLUMN_RADIUS - 0.03,
  COLUMN_RADIUS + 0.03,
  3.05,
  -bayStep * 0.4,
  bayStep * 0.8,
  24,
);
const mullionGeometry = new CylinderGeometry(0.05, 0.05, 3.05, 8);

for (let i = 0; i < BAY_COUNT; i += 1) {
  if (OPEN_BAYS.has(i)) {
    continue;
  }
  const bayAngle = i * bayStep;

  const glass = new Mesh(glassGeometry, glassPanel);
  glass.rotation.y = bayAngle;
  glass.position.y = DECK_TOP + 1.55;
  glass.name = `Glazing ${i}`;
  pavilion.add(glass);

  // Vertical mullion splitting each leaf, for scale reading.
  const mullion = new Mesh(mullionGeometry, brushedChrome);
  mullion.position.set(
    Math.sin(bayAngle) * COLUMN_RADIUS,
    DECK_TOP + 1.55,
    Math.cos(bayAngle) * COLUMN_RADIUS,
  );
  mullion.name = `Mullion ${i}`;
  pavilion.add(mullion);
}

/* -------------------------------------------------------------------- roof */

const roofProfile = [
  new Vector2(0.0, 1.05),
  new Vector2(1.2, 1.0),
  new Vector2(2.4, 0.87),
  new Vector2(3.6, 0.68),
  new Vector2(4.6, 0.44),
  new Vector2(5.4, 0.22),
  new Vector2(5.92, 0.02),
  new Vector2(6.0, -0.16),
  new Vector2(5.92, -0.34),
  new Vector2(5.4, -0.44),
  new Vector2(4.4, -0.52),
  new Vector2(3.0, -0.58),
  new Vector2(1.5, -0.62),
  new Vector2(0.0, -0.64),
];
const roof = new Mesh(new LatheGeometry(roofProfile, 64), creamLightTwoSided);
roof.position.y = ROOF_ORIGIN_Y;
roof.name = 'Canopy';
pavilion.add(roof);

// Radial ribs across the soffit — structure, and something to catch the uplight.
const ribGeometry = new CylinderGeometry(0.055, 0.055, 4.5, 8);
for (let i = 0; i < 16; i += 1) {
  const angle = (i / 16) * Math.PI * 2;
  const rib = new Mesh(ribGeometry, timberDark);
  rib.position.set(
    Math.sin(angle) * 3.5,
    ROOF_ORIGIN_Y - 0.56,
    Math.cos(angle) * 3.5,
  );
  rib.rotation.set(Math.PI / 2, 0, angle);
  rib.name = `Soffit rib ${i}`;
  pavilion.add(rib);
}

// Stained timber soffit — the single biggest warmth cue from underneath.
const soffit = new Mesh(new RingGeometry(1.32, 5.72, 64, 1), timberDarkTwoSided);
soffit.rotation.x = Math.PI / 2;
soffit.position.y = ROOF_ORIGIN_Y - 0.63;
soffit.name = 'Canopy soffit';
pavilion.add(soffit);

// Glazed oculus in the hole, ringed in steel.
const oculus = new Mesh(new CircleGeometry(1.36, 48), glassPanel);
oculus.rotation.x = Math.PI / 2;
oculus.position.y = ROOF_ORIGIN_Y - 0.6;
oculus.name = 'Oculus glazing';
pavilion.add(oculus);

const oculusRing = new Mesh(new TorusGeometry(1.33, 0.06, 10, 48), polishedSteel);
oculusRing.rotation.x = -Math.PI / 2;
oculusRing.position.y = ROOF_ORIGIN_Y - 0.62;
oculusRing.name = 'Oculus ring';
pavilion.add(oculusRing);

// Panel seams across the canopy, so it is not a blank disc from above.
const SEAMS: Array<[number, number]> = [
  [2.0, 0.915],
  [3.6, 0.68],
  [5.0, 0.33],
];
for (const [seamRadius, seamHeight] of SEAMS) {
  const seam = new Mesh(new TorusGeometry(seamRadius, 0.028, 8, 72), creamShade);
  seam.rotation.x = -Math.PI / 2;
  seam.position.y = ROOF_ORIGIN_Y + seamHeight + 0.012;
  seam.name = `Canopy seam ${seamRadius}`;
  pavilion.add(seam);
}

// Warm cove light where the soffit meets the oculus boss.
const cove = new Mesh(new TorusGeometry(1.45, 0.05, 8, 56), ledWarm);
cove.rotation.x = -Math.PI / 2;
cove.position.y = ROOF_ORIGIN_Y - 0.62;
cove.name = 'Soffit cove';
pavilion.add(cove);

// Violet fascia band under the canopy rim — the Horizon facade cue.
const fascia = new Mesh(
  arcWallGeometry(5.8, 5.94, 0.8, 0, Math.PI * 2, 72),
  brandVioletTwoSided,
);
fascia.position.y = ROOF_ORIGIN_Y - 0.62;
fascia.name = 'Fascia band';
pavilion.add(fascia);

const fasciaRing = new Mesh(new TorusGeometry(5.94, 0.1, 10, 64), brandBlueGlow);
fasciaRing.rotation.x = -Math.PI / 2;
fasciaRing.position.y = ROOF_ORIGIN_Y - 1.0;
fasciaRing.name = 'Fascia ring';
pavilion.add(fasciaRing);

const eaveLed = new Mesh(new TorusGeometry(5.99, 0.03, 6, 80), ledCyan);
eaveLed.rotation.x = -Math.PI / 2;
eaveLed.position.y = ROOF_ORIGIN_Y - 0.2;
eaveLed.name = 'Eave light line';
pavilion.add(eaveLed);

/* --------------------------------------------------------------- info walls */

const wallGeometry = arcWallGeometry(
  WALL_RADIUS - 0.09,
  WALL_RADIUS + 0.09,
  2.7,
  -0.55,
  1.1,
);
// Rotated a half-turn from the approach bearings, so each bridge arrives at an
// OPENING and faces the inside of the wall opposite. The panels then hang on
// the inner faces, which is what gives a visitor a reason to walk in.
for (let i = 0; i < 3; i += 1) {
  const wall = new Mesh(wallGeometry, timberWall);
  wall.rotation.y = (i / 3) * Math.PI * 2 + Math.PI;
  wall.position.y = DECK_TOP + 1.35;
  wall.name = `Info wall ${i}`;
  pavilion.add(wall);

  const cap = new Mesh(new TorusGeometry(WALL_RADIUS, 0.07, 8, 36, 1.1), brandBlueGlow);
  // Torus arcs in XY from +X; lay it flat and align with the wall segment.
  cap.rotation.set(-Math.PI / 2, 0, 0);
  cap.rotation.z = -0.55 + Math.PI / 2 - ((i / 3) * Math.PI * 2 + Math.PI);
  cap.position.y = DECK_TOP + 2.7;
  cap.name = `Info wall cap ${i}`;
  pavilion.add(cap);

  const base = new Mesh(new TorusGeometry(WALL_RADIUS, 0.09, 8, 36, 1.1), brushedChrome);
  base.rotation.set(-Math.PI / 2, 0, 0);
  base.rotation.z = -0.55 + Math.PI / 2 - ((i / 3) * Math.PI * 2 + Math.PI);
  base.position.y = DECK_TOP + 0.06;
  base.name = `Info wall base ${i}`;
  pavilion.add(base);
}

export default shadowProp(pavilion);
