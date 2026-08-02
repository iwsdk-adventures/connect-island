/**
 * Audience bench for the stage apron. Origin at floor contact, seat faces
 * local -Z with the backrest at +Z.
 *
 * 3.2 m rather than 2.6: the stage seating is now two benches flanking the
 * walkway instead of five packed into an arc, so each one has to carry more of
 * the row. Five 2.6 m benches on a 6.2 m circle could not help overlapping.
 */

import { Group, Mesh } from '@iwsdk/core';
import {
  creamShell,
  roundedSlabGeometry,
  shadowProp,
  timberFine,
} from './palette.js';

const bench = new Group();
bench.name = 'Bench';

const seat = new Mesh(roundedSlabGeometry(3.2, 0.16, 0.62, 0.07), timberFine);
seat.position.y = 0.46;
seat.name = 'Bench seat';
bench.add(seat);

const backrest = new Mesh(roundedSlabGeometry(3.2, 0.42, 0.14, 0.06), timberFine);
backrest.position.set(0, 0.74, 0.26);
backrest.rotation.x = 0.18;
backrest.name = 'Bench backrest';
bench.add(backrest);

const supportGeometry = roundedSlabGeometry(0.18, 0.46, 0.52, 0.05);
for (const x of [-1.22, 1.22]) {
  const support = new Mesh(supportGeometry, creamShell);
  support.position.set(x, 0.23, 0);
  support.name = `Bench support ${x < 0 ? 'left' : 'right'}`;
  bench.add(support);
}

export default shadowProp(bench);
