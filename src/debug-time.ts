/**
 * Review hook for the day-night cycle.
 *
 * Set to a value in [0, 1) to freeze the clock at that point and park the
 * camera at a fixed review pose, so the same frame can be compared across the
 * whole cycle. `null` runs normally, which is what ships.
 *
 * `?t=0.35` on the URL does the same thing at runtime without a rebuild.
 */
export const DEBUG_TIME_OF_DAY: number | null = null;

/** Fixed pose used while a debug time is set: shows ground, water and skyline. */
// Tuned against the runtime's portrait canvas, not the wide editor preview:
// a pose framed for 1200x720 leaves the site in a thin band at 720x800.
export const DEBUG_REVIEW_EYE: readonly [number, number, number] = [15, 8, 22];
export const DEBUG_REVIEW_TARGET: readonly [number, number, number] = [-2, 2.2, -1];
