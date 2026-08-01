/**
 * Entrance markers: a pair of tapered stone-and-timber blade walls with a
 * recessed light channel and a chrome coping, framing the approach.
 *
 * Deliberately slab-shaped rather than conical — a cone with a ball on top
 * reads as a skittle, not architecture. Local -Z points into the site.
 */

import { CylinderGeometry, Group, Mesh } from '@iwsdk/core';
import {
  brushedChrome,
  creamShell,
  ledBlue,
  roundedSlabGeometry,
  timberDark,
} from './palette.js';

const OFFSET = 5.4;
const HEIGHT = 4.6;
const THICKNESS = 0.62;

const gate = new Group();
gate.name = 'Entrance gate';

const bladeGeometry = roundedSlabGeometry(1.5, HEIGHT, THICKNESS, 0.16);
const timberInlayGeometry = roundedSlabGeometry(0.9, HEIGHT * 0.66, 0.06, 0.08);
const lightChannelGeometry = roundedSlabGeometry(0.09, HEIGHT * 0.78, 0.04, 0.03);
const copingGeometry = roundedSlabGeometry(1.62, 0.14, THICKNESS + 0.1, 0.05);
const plinthGeometry = new CylinderGeometry(1.05, 1.18, 0.26, 24);

for (const side of [-1, 1]) {
  const x = side * OFFSET;
  const label = side < 0 ? 'left' : 'right';

  const plinth = new Mesh(plinthGeometry, creamShell);
  plinth.position.set(x, 0.13, 0);
  plinth.name = `Gate plinth ${label}`;
  gate.add(plinth);

  const blade = new Mesh(bladeGeometry, creamShell);
  blade.position.set(x, 0.26 + HEIGHT / 2, 0);
  blade.name = `Gate blade ${label}`;
  gate.add(blade);

  // Timber inlay on the face that greets arrivals.
  const inlay = new Mesh(timberInlayGeometry, timberDark);
  inlay.position.set(x, 0.26 + HEIGHT * 0.52, THICKNESS / 2 + 0.01);
  inlay.name = `Gate inlay ${label}`;
  gate.add(inlay);

  // Light channel recessed into the inner edge, facing the path.
  const channel = new Mesh(lightChannelGeometry, ledBlue);
  channel.position.set(x - side * 0.72, 0.26 + HEIGHT * 0.5, 0);
  channel.rotation.y = Math.PI / 2;
  channel.name = `Gate light channel ${label}`;
  gate.add(channel);

  const coping = new Mesh(copingGeometry, brushedChrome);
  coping.position.set(x, 0.26 + HEIGHT + 0.05, 0);
  coping.name = `Gate coping ${label}`;
  gate.add(coping);
}

export default gate;
