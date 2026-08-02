/** Terracotta planter with a monstera cluster — low, wide, seating-height. */

import { Group } from '@iwsdk/core';
import { shadowProp } from './palette.js';
import { createMonstera, createPot } from './plants.js';

const planter = new Group();
planter.name = 'Planter monstera';

planter.add(createPot());

const monstera = createMonstera(7, 1.15);
monstera.position.y = 0.5;
planter.add(monstera);

export default shadowProp(planter);
