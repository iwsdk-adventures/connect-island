/**
 * Render-cost switches that are worth being able to flip in one place while
 * profiling on a headset.
 *
 * A capture off the device showed the frame blocked on the GPU rather than on
 * JS, so the things that matter here are all fill and shading rather than
 * anything algorithmic.
 */

/**
 * How grounded objects get their contact with the floor.
 *
 * - `real` renders a shadow map: one extra pass over every casting mesh, then a
 *   depth comparison per lit fragment on every receiver. Correct, and by far
 *   the most expensive of the three.
 * - `blob` drops the shadow map entirely and puts a soft dark ellipse under
 *   each mass instead. One extra instanced draw call for the whole site, no
 *   second scene pass, and no per-fragment cost on anything that is not
 *   directly under a blob. The shadows no longer move with the sun.
 * - `none` is the control: no contact shading at all. Only useful for measuring
 *   what the other two actually cost.
 */
export const SHADOW_MODE: 'real' | 'blob' | 'none' = 'blob';
