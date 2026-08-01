/** Terracotta planter with a compact palm — pavilion and path dressing. */

import { Group } from '@iwsdk/core';
import { createPalm, createPot } from './plants.js';

const planter = new Group();
planter.name = 'Planter palm';

planter.add(createPot());

const palm = createPalm(1.9, 8);
palm.position.y = 0.5;
planter.add(palm);

export default planter;
