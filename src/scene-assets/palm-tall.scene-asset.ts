/**
 * Landscape palm planted into the plaza.
 *
 * No planting mound: a dark disc at the base reads as a painted-on shadow decal
 * rather than geometry, which is worse than no base at all now that the sun
 * casts real shadows. Height is kept under the pavilion eaves so the planting
 * does not overtop the architecture.
 */

import { Group } from '@iwsdk/core';
import { shadowProp } from './palette.js';
import { createPalm } from './plants.js';

const palm = new Group();
palm.name = 'Palm tall';

palm.add(createPalm(3.9, 9));

export default shadowProp(palm);
