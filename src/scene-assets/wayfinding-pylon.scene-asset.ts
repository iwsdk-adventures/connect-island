/**
 * Wayfinding pylon: a slim monolith with vertical light edges and a dark screen
 * face, on a chrome plinth. Placed where the radial paths meet the perimeter, so
 * the corners read as destinations from a distance.
 *
 * Origin at floor contact; the screen face points along local -Z.
 */

import { CylinderGeometry, Group, Mesh } from '@iwsdk/core';
import {
  brandScreenLit,
  brushedChrome,
  creamShell,
  graphite,
  ledBlue,
  roundedSlabGeometry,
  shadowProp,
} from './palette.js';

const HEIGHT = 3.3;
const WIDTH = 0.72;

const pylon = new Group();
pylon.name = 'Wayfinding pylon';

const plinth = new Mesh(new CylinderGeometry(0.42, 0.5, 0.16, 20), brushedChrome);
plinth.position.y = 0.08;
plinth.name = 'Pylon plinth';
pylon.add(plinth);

const body = new Mesh(roundedSlabGeometry(WIDTH, HEIGHT, 0.3, 0.09), creamShell);
body.position.y = 0.16 + HEIGHT / 2;
body.name = 'Pylon body';
pylon.add(body);

// Recessed screen face.
const screen = new Mesh(roundedSlabGeometry(0.52, 1.85, 0.03, 0.05), brandScreenLit);
screen.position.set(0, 0.16 + HEIGHT * 0.62, -0.152);
screen.name = 'Pylon screen';
pylon.add(screen);

const screenSurround = new Mesh(roundedSlabGeometry(0.58, 1.93, 0.02, 0.06), graphite);
screenSurround.position.set(0, 0.16 + HEIGHT * 0.62, -0.148);
screenSurround.name = 'Pylon screen surround';
pylon.add(screenSurround);

// Vertical light edges down both long sides.
const edgeGeometry = roundedSlabGeometry(0.05, HEIGHT * 0.9, 0.06, 0.02);
for (const side of [-1, 1]) {
  const edge = new Mesh(edgeGeometry, ledBlue);
  edge.position.set(side * (WIDTH / 2 - 0.015), 0.16 + HEIGHT / 2, 0);
  edge.name = `Pylon edge ${side < 0 ? 'left' : 'right'}`;
  pylon.add(edge);
}

const crown = new Mesh(roundedSlabGeometry(WIDTH * 0.62, 0.06, 0.32, 0.02), ledBlue);
crown.position.y = 0.16 + HEIGHT + 0.03;
crown.name = 'Pylon crown';
pylon.add(crown);

export default shadowProp(pylon);
