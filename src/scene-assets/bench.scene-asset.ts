/**
 * Audience bench for the stage apron. Origin at floor contact, seat faces
 * local -Z with the backrest at +Z.
 */

import { Group, Mesh } from '@iwsdk/core';
import { creamShell, roundedSlabGeometry, timberFine } from './palette.js';

const bench = new Group();
bench.name = 'Bench';

const seat = new Mesh(roundedSlabGeometry(2.6, 0.16, 0.62, 0.07), timberFine);
seat.position.y = 0.46;
seat.name = 'Bench seat';
bench.add(seat);

const backrest = new Mesh(roundedSlabGeometry(2.6, 0.42, 0.14, 0.06), timberFine);
backrest.position.set(0, 0.74, 0.26);
backrest.rotation.x = 0.18;
backrest.name = 'Bench backrest';
bench.add(backrest);

const supportGeometry = roundedSlabGeometry(0.18, 0.46, 0.52, 0.05);
for (const x of [-0.95, 0.95]) {
  const support = new Mesh(supportGeometry, creamShell);
  support.position.set(x, 0.23, 0);
  support.name = `Bench support ${x < 0 ? 'left' : 'right'}`;
  bench.add(support);
}

export default bench;
