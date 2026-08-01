/**
 * Component declarations for the Connect site.
 *
 * System-free by contract: the editor imports this module to build its
 * inspector, so it must not pull in systems, DOM or renderer code.
 */

import { createComponent, Types } from '@iwsdk/core';

/** Placed on the firepit entity, alongside its PointLight. */
export const FirePit = createComponent('FirePit', {
  baseIntensity: {
    type: Types.Float32,
    default: 34,
    label: 'Base intensity',
    min: 0,
    max: 200,
    help: 'Candela the firelight settles around.',
  },
  flickerAmount: {
    type: Types.Float32,
    default: 0.3,
    label: 'Flicker amount',
    min: 0,
    max: 1,
    help: 'Fraction of base intensity the flicker swings through.',
  },
  flickerSpeed: {
    type: Types.Float32,
    default: 5.5,
    label: 'Flicker speed',
    min: 0.1,
    max: 20,
  },
});

/** Placed on each stage SpotLight entity. */
export const StageLight = createComponent('StageLight', {
  sweepSpeed: {
    type: Types.Float32,
    default: 0.28,
    label: 'Sweep speed',
    min: 0,
    max: 4,
  },
  sweepRange: {
    type: Types.Float32,
    default: 0.42,
    label: 'Sweep range (rad)',
    min: 0,
    max: 1.5,
  },
  phase: {
    type: Types.Float32,
    default: 0,
    label: 'Phase offset',
    min: 0,
    max: 6.284,
  },
});

/** Placed on the entrance monument entity. */
export const Monument = createComponent('Monument', {
  spinSpeed: {
    type: Types.Float32,
    default: 0.075,
    label: 'Spin speed (rad/s)',
    min: -1,
    max: 1,
  },
});
