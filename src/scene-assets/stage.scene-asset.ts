/**
 * The session stage: a plaster riser with a lit nosing and curved steps, a
 * half-shell backdrop with a deep-blue curved screen and violet crown band, a
 * triangular-section lighting truss with fixtures, and flanking PA cabinets.
 *
 * The audience side is local -Z, so the backdrop occupies the +Z half
 * (theta 0 is +Z in Three's cylinder winding).
 */

import {
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  TorusGeometry,
} from '@iwsdk/core';
import {
  arcWallGeometry,
  brandBlueGlow,
  brandScreenTwoSided,
  brandVioletTwoSided,
  brushedChrome,
  creamLight,
  creamShell,
  creamShellTwoSided,
  darkMetal,
  graphite,
  ledCyan,
  ledViolet,
  roundedSlabGeometry,
  shadowProp,
  timberDeck,
} from './palette.js';

const RISER_TOP = 0.6;
const BACKDROP_HEIGHT = 5.2;
const TRUSS_RADIUS = 4.3;
const TRUSS_Y = 4.85;

const stage = new Group();
stage.name = 'Session stage';

/* ------------------------------------------------------------------- riser */

const riserSkirt = new Mesh(new CylinderGeometry(4.72, 4.82, 0.16, 56), graphite);
riserSkirt.position.y = 0.08;
riserSkirt.name = 'Riser skirt';
stage.add(riserSkirt);

const riser = new Mesh(new CylinderGeometry(4.6, 4.85, RISER_TOP, 56), creamShell);
riser.position.y = RISER_TOP / 2;
riser.name = 'Stage riser';
stage.add(riser);

const riserBoards = new Mesh(new CircleGeometry(4.6, 56), timberDeck);
riserBoards.rotation.x = -Math.PI / 2;
riserBoards.position.y = RISER_TOP + 0.002;
riserBoards.name = 'Stage boards';
stage.add(riserBoards);

const riserRim = new Mesh(new TorusGeometry(4.62, 0.1, 10, 56), creamLight);
riserRim.rotation.x = -Math.PI / 2;
riserRim.position.y = RISER_TOP;
riserRim.name = 'Stage riser rim';
stage.add(riserRim);

// Lit nosing under the rim.
const riserLed = new Mesh(new TorusGeometry(4.66, 0.04, 6, 72), ledViolet);
riserLed.rotation.x = -Math.PI / 2;
riserLed.position.y = RISER_TOP - 0.16;
riserLed.name = 'Riser light line';
stage.add(riserLed);

// Two curved steps on the downstage arc.
for (let i = 0; i < 2; i += 1) {
  const step = new Mesh(
    new CylinderGeometry(5.2 + i * 0.5, 5.3 + i * 0.5, 0.2, 44, 1, false, Math.PI * 0.62, Math.PI * 0.76),
    creamShell,
  );
  step.position.y = 0.4 - i * 0.2;
  step.name = `Stage step ${i}`;
  stage.add(step);
}

/* ---------------------------------------------------------------- backdrop */

const backdrop = new Mesh(
  arcWallGeometry(5.32, 5.48, BACKDROP_HEIGHT, -Math.PI / 2, Math.PI, 48),
  creamShellTwoSided,
);
backdrop.position.y = RISER_TOP + BACKDROP_HEIGHT / 2;
backdrop.name = 'Backdrop shell';
stage.add(backdrop);

const screen = new Mesh(
  arcWallGeometry(5.16, 5.24, 3.0, -1.15, 2.3, 44),
  brandScreenTwoSided,
);
screen.position.y = RISER_TOP + 2.1;
screen.name = 'Stage screen';
stage.add(screen);

// Chrome reveal framing the screen, top and bottom.
for (const offset of [1.62, -1.62]) {
  const reveal = new Mesh(
    new TorusGeometry(5.16, 0.055, 8, 44, 2.3),
    brushedChrome,
  );
  reveal.rotation.set(-Math.PI / 2, 0, 0);
  reveal.rotation.z = Math.PI / 2 + 1.15;
  reveal.position.y = RISER_TOP + 2.1 + offset;
  reveal.name = `Screen reveal ${offset > 0 ? 'top' : 'bottom'}`;
  stage.add(reveal);
}

const crown = new Mesh(
  arcWallGeometry(5.4, 5.54, 0.75, -Math.PI / 2, Math.PI, 48),
  brandVioletTwoSided,
);
crown.position.y = RISER_TOP + BACKDROP_HEIGHT - 0.38;
crown.name = 'Backdrop crown';
stage.add(crown);

const crownLed = new Mesh(new TorusGeometry(5.5, 0.04, 6, 48, Math.PI), ledCyan);
crownLed.rotation.set(-Math.PI / 2, 0, 0);
crownLed.rotation.z = Math.PI / 2;
crownLed.position.y = RISER_TOP + BACKDROP_HEIGHT - 0.76;
crownLed.name = 'Crown light line';
stage.add(crownLed);

/* ------------------------------------------------------------------- truss */

// Triangular-section ring: two rails at height, one above and centred.
const railInner = new Mesh(new TorusGeometry(TRUSS_RADIUS - 0.13, 0.045, 8, 64), darkMetal);
railInner.rotation.x = -Math.PI / 2;
railInner.position.y = TRUSS_Y;
railInner.name = 'Truss rail inner';
stage.add(railInner);

const railOuter = new Mesh(new TorusGeometry(TRUSS_RADIUS + 0.13, 0.045, 8, 64), darkMetal);
railOuter.rotation.x = -Math.PI / 2;
railOuter.position.y = TRUSS_Y;
railOuter.name = 'Truss rail outer';
stage.add(railOuter);

const railTop = new Mesh(new TorusGeometry(TRUSS_RADIUS, 0.045, 8, 64), darkMetal);
railTop.rotation.x = -Math.PI / 2;
railTop.position.y = TRUSS_Y + 0.26;
railTop.name = 'Truss rail top';
stage.add(railTop);

// Alternating struts tying the three rails together.
const strutGeometry = new CylinderGeometry(0.025, 0.025, 0.34, 6);
for (let i = 0; i < 18; i += 1) {
  const angle = (i / 18) * Math.PI * 2;
  const lean = i % 2 === 0 ? 0.42 : -0.42;
  const strut = new Mesh(strutGeometry, darkMetal);
  strut.position.set(
    Math.sin(angle) * TRUSS_RADIUS,
    TRUSS_Y + 0.13,
    Math.cos(angle) * TRUSS_RADIUS,
  );
  strut.rotation.set(0, angle, lean);
  strut.name = `Truss strut ${i}`;
  stage.add(strut);
}

// Fixtures across the downstage arc.
const fixtureBody = new CylinderGeometry(0.13, 0.17, 0.32, 14);
const fixtureLens = new CylinderGeometry(0.17, 0.17, 0.04, 14);
const fixtureYoke = new CylinderGeometry(0.03, 0.03, 0.22, 8);
for (let i = 0; i < 5; i += 1) {
  const angle = Math.PI * (0.72 + i * 0.14);
  const x = Math.sin(angle) * TRUSS_RADIUS;
  const z = Math.cos(angle) * TRUSS_RADIUS;

  const yoke = new Mesh(fixtureYoke, darkMetal);
  yoke.position.set(x, TRUSS_Y - 0.12, z);
  yoke.name = `Stage fixture yoke ${i}`;
  stage.add(yoke);

  const body = new Mesh(fixtureBody, darkMetal);
  body.position.set(x, TRUSS_Y - 0.38, z);
  body.name = `Stage fixture ${i}`;
  stage.add(body);

  const lens = new Mesh(fixtureLens, brandBlueGlow);
  lens.position.set(x, TRUSS_Y - 0.55, z);
  lens.name = `Stage fixture lens ${i}`;
  stage.add(lens);
}

/* --------------------------------------------------------------------- PA */

for (const side of [-1, 1]) {
  const x = side * 4.05;
  const z = -2.4;

  const cabinet = new Mesh(roundedSlabGeometry(0.72, 2.05, 0.62, 0.06), graphite);
  cabinet.position.set(x, 1.02, z);
  cabinet.rotation.y = side * -0.34;
  cabinet.name = `PA cabinet ${side < 0 ? 'left' : 'right'}`;
  stage.add(cabinet);

  const grille = new Mesh(roundedSlabGeometry(0.58, 1.78, 0.03, 0.04), darkMetal);
  grille.position.set(x + side * 0.11, 1.02, z - 0.3);
  grille.rotation.y = side * -0.34;
  grille.name = `PA grille ${side < 0 ? 'left' : 'right'}`;
  stage.add(grille);

  const indicator = new Mesh(roundedSlabGeometry(0.1, 0.03, 0.02, 0.01), ledCyan);
  indicator.position.set(x + side * 0.13, 0.18, z - 0.32);
  indicator.rotation.y = side * -0.34;
  indicator.name = `PA indicator ${side < 0 ? 'left' : 'right'}`;
  stage.add(indicator);
}

/* ---------------------------------------------------------------- dressing */

// A bare platform reads as unfinished, so the stage is set for a session.
const lectern = new Mesh(roundedSlabGeometry(0.62, 1.02, 0.44, 0.07), timberDeck);
lectern.position.set(-1.35, RISER_TOP + 0.51, -1.7);
lectern.rotation.y = 0.22;
lectern.name = 'Lectern';
stage.add(lectern);

const lecternTop = new Mesh(roundedSlabGeometry(0.72, 0.06, 0.5, 0.03), graphite);
lecternTop.position.set(-1.35, RISER_TOP + 1.05, -1.72);
lecternTop.rotation.set(-0.18, 0.22, 0);
lecternTop.name = 'Lectern top';
stage.add(lecternTop);

const lecternLight = new Mesh(roundedSlabGeometry(0.4, 0.02, 0.03, 0.01), ledCyan);
lecternLight.position.set(-1.35, RISER_TOP + 1.09, -1.9);
lecternLight.rotation.y = 0.22;
lecternLight.name = 'Lectern light';
stage.add(lecternLight);

// Two stools for a fireside-chat format.
const stoolSeat = new CylinderGeometry(0.24, 0.24, 0.08, 20);
const stoolStem = new CylinderGeometry(0.05, 0.07, 0.56, 12);
const stoolFoot = new CylinderGeometry(0.2, 0.22, 0.04, 16);
[
  [1.25, -1.35],
  [2.15, -0.35],
].forEach(([sx, sz], index) => {
  const foot = new Mesh(stoolFoot, brushedChrome);
  foot.position.set(sx, RISER_TOP + 0.02, sz);
  foot.name = `Stool foot ${index}`;
  stage.add(foot);

  const stem = new Mesh(stoolStem, brushedChrome);
  stem.position.set(sx, RISER_TOP + 0.3, sz);
  stem.name = `Stool stem ${index}`;
  stage.add(stem);

  const seat = new Mesh(stoolSeat, timberDeck);
  seat.position.set(sx, RISER_TOP + 0.61, sz);
  seat.name = `Stool seat ${index}`;
  stage.add(seat);
});

// Wedge monitors on the downstage lip.
for (const side of [-1, 1]) {
  const monitor = new Mesh(roundedSlabGeometry(0.62, 0.34, 0.44, 0.04), graphite);
  monitor.position.set(side * 2.45, RISER_TOP + 0.17, -3.15);
  monitor.rotation.set(0.34, side * -0.2, 0);
  monitor.name = `Stage monitor ${side < 0 ? 'left' : 'right'}`;
  stage.add(monitor);
}

export default shadowProp(stage);
