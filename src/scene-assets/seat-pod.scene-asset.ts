/**
 * Firepit lounge chair: a timber-slat frame with a fabric cushion.
 *
 * Deliberately rectilinear and slatted. The previous version was a white
 * lathed tub with a recessed coloured pan, and every reviewer read it as
 * sanitaryware — the silhouette, not the colour, was the problem.
 *
 * Origin at floor contact; the seat faces local -Z.
 */

import { Group, Mesh } from '@iwsdk/core';
import {
  fabricCushion,
  graphite,
  roundedSlabGeometry,
  timberDark,
  timberFine,
} from './palette.js';

const WIDTH = 0.78;
const DEPTH = 0.76;
const SEAT_H = 0.42;

const seatPod = new Group();
seatPod.name = 'Lounge chair';

// Frame: two side rails on short feet.
const railGeometry = roundedSlabGeometry(0.07, 0.1, DEPTH, 0.03);
const footGeometry = roundedSlabGeometry(0.07, SEAT_H, 0.07, 0.02);
for (const side of [-1, 1]) {
  const x = side * (WIDTH / 2 - 0.04);
  const label = side < 0 ? 'left' : 'right';

  const rail = new Mesh(railGeometry, timberDark);
  rail.position.set(x, SEAT_H, 0);
  rail.name = `Chair rail ${label}`;
  seatPod.add(rail);

  for (const z of [-DEPTH / 2 + 0.07, DEPTH / 2 - 0.07]) {
    const foot = new Mesh(footGeometry, graphite);
    foot.position.set(x, SEAT_H / 2, z);
    foot.name = `Chair foot ${label}`;
    seatPod.add(foot);
  }
}

// Seat slats.
const slatGeometry = roundedSlabGeometry(WIDTH - 0.02, 0.045, 0.15, 0.02);
for (let i = 0; i < 4; i += 1) {
  const slat = new Mesh(slatGeometry, timberFine);
  slat.position.set(0, SEAT_H + 0.05, -0.25 + i * 0.17);
  slat.name = `Seat slat ${i}`;
  seatPod.add(slat);
}

// Back slats, raked.
const backSlatGeometry = roundedSlabGeometry(WIDTH - 0.06, 0.115, 0.05, 0.02);
for (let i = 0; i < 4; i += 1) {
  const slat = new Mesh(backSlatGeometry, timberFine);
  const h = 0.13 + i * 0.145;
  slat.position.set(0, SEAT_H + h, DEPTH / 2 - 0.06 + h * 0.2);
  slat.rotation.x = -0.2;
  slat.name = `Back slat ${i}`;
  seatPod.add(slat);
}

// Cushion.
const cushion = new Mesh(roundedSlabGeometry(WIDTH - 0.1, 0.1, DEPTH - 0.16, 0.05), fabricCushion);
cushion.position.set(0, SEAT_H + 0.12, 0.01);
cushion.name = 'Seat cushion';
seatPod.add(cushion);

const backCushion = new Mesh(roundedSlabGeometry(WIDTH - 0.14, 0.34, 0.1, 0.05), fabricCushion);
backCushion.position.set(0, SEAT_H + 0.32, DEPTH / 2 - 0.13);
backCushion.rotation.x = -0.2;
backCushion.name = 'Back cushion';
seatPod.add(backCushion);

export default seatPod;
