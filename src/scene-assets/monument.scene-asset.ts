/**
 * The entrance sculpture: the Meta mark on a low plinth, about 2 m to the top
 * of the mark — head height, not monumental. It reads as something you walk up
 * to and around, and it no longer blocks the view of the pavilion behind it.
 *
 * The mark comes from meta-mark.ts, which uses a Gerono lemniscate with a
 * cosine depth term so the ribbon crosses itself exactly once and the two
 * strands separate cleanly at the node. The mark's face is the local XY plane,
 * so a placement yaw of 0 presents it to a visitor standing at +Z.
 *
 * The loop mesh is named so MonumentSystem can turn it.
 */

import {
  CylinderGeometry,
  Group,
  Mesh,
  TorusGeometry,
  TubeGeometry,
} from '@iwsdk/core';
import {
  arcWallGeometry,
  creamLight,
  creamShade,
  graphite,
  iridescentChrome,
  ledCyan,
  polishedSteel,
  timberWall,
} from './palette.js';
import { MetaMarkCurve } from './meta-mark.js';

// 2:1 width to height, per the published mark.
const LOOP_HALF_WIDTH = 0.85;
const LOOP_HEIGHT = 0.85;
const LOOP_DEPTH = 0.19;
const TUBE_RADIUS = 0.12;
const PLINTH_TOP = 0.8;
const LOOP_CENTRE_Y = 1.42;

const monument = new Group();
monument.name = 'Meta sculpture';

/* ------------------------------------------------------------------ plinth */

const step = new Mesh(new CylinderGeometry(0.66, 0.72, 0.1, 40), creamShade);
step.position.y = 0.05;
step.name = 'Plinth step';
monument.add(step);

const drum = new Mesh(new CylinderGeometry(0.46, 0.56, 0.62, 40), creamShade);
drum.position.y = 0.41;
drum.name = 'Plinth drum';
monument.add(drum);

// Timber band with real thickness and closed ends.
const band = new Mesh(
  arcWallGeometry(0.48, 0.545, 0.22, 0, Math.PI * 2, 40),
  timberWall,
);
band.position.y = 0.36;
band.name = 'Plinth timber band';
monument.add(band);

for (const revealY of [0.25, 0.47]) {
  const reveal = new Mesh(new TorusGeometry(0.549, 0.012, 8, 40), polishedSteel);
  reveal.rotation.x = -Math.PI / 2;
  reveal.position.y = revealY;
  reveal.name = `Plinth reveal ${revealY}`;
  monument.add(reveal);
}

const capTop = new Mesh(new CylinderGeometry(0.5, 0.5, 0.08, 40), creamLight);
capTop.position.y = PLINTH_TOP - 0.04;
capTop.name = 'Plinth cap';
monument.add(capTop);

const capEdge = new Mesh(new TorusGeometry(0.5, 0.035, 10, 40), creamLight);
capEdge.rotation.x = -Math.PI / 2;
capEdge.position.y = PLINTH_TOP - 0.04;
capEdge.name = 'Plinth cap edge';
monument.add(capEdge);

// Four recessed uplighters washing the mark from below.
const housingGeometry = new CylinderGeometry(0.045, 0.05, 0.04, 12);
const lensGeometry = new CylinderGeometry(0.034, 0.034, 0.012, 12);
for (let i = 0; i < 4; i += 1) {
  const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
  const x = Math.sin(angle) * 0.35;
  const z = Math.cos(angle) * 0.35;

  const housing = new Mesh(housingGeometry, graphite);
  housing.position.set(x, PLINTH_TOP - 0.02, z);
  housing.name = `Uplight housing ${i}`;
  monument.add(housing);

  const lens = new Mesh(lensGeometry, ledCyan);
  lens.position.set(x, PLINTH_TOP + 0.006, z);
  lens.name = `Uplight lens ${i}`;
  monument.add(lens);
}

/* -------------------------------------------------------------------- mark */

const stem = new Mesh(
  new CylinderGeometry(0.075, 0.11, LOOP_CENTRE_Y - PLINTH_TOP + 0.06, 20),
  polishedSteel,
);
stem.position.y = PLINTH_TOP + (LOOP_CENTRE_Y - PLINTH_TOP) / 2;
stem.name = 'Sculpture stem';
monument.add(stem);

const stemCollar = new Mesh(new TorusGeometry(0.11, 0.022, 10, 20), graphite);
stemCollar.rotation.x = -Math.PI / 2;
stemCollar.position.y = PLINTH_TOP + 0.03;
stemCollar.name = 'Stem collar';
monument.add(stemCollar);

const loop = new Mesh(
  new TubeGeometry(
    new MetaMarkCurve({
      halfWidth: LOOP_HALF_WIDTH,
      height: LOOP_HEIGHT,
      depth: LOOP_DEPTH,
    }),
    280,
    TUBE_RADIUS,
    20,
    true,
  ),
  iridescentChrome,
);
loop.position.y = LOOP_CENTRE_Y;
loop.name = 'InfinityLoop';
monument.add(loop);

export default monument;
