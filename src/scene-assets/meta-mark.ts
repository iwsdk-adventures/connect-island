/**
 * The Meta mark as a swept closed curve.
 *
 * Paul Bourke's page (paulbourke.net/geometry/meta/) concludes the real logo has
 * no clean closed form and publishes a Hermite control polygon as the nearest
 * approximation. Swept literally, that polygon produces an open bow with no
 * self-crossing — the defining feature of the mark is that the ribbon passes
 * through itself exactly once, enclosing two counters, and the bow has neither.
 *
 * So this uses the shape Bourke names as the correct base instead: a Gerono
 * lemniscate, which self-crosses exactly once at the origin.
 *
 *   x = halfWidth · sin(t)
 *   y = height · sin(2t) / 2
 *   z = depth · cos(t)
 *
 * The depth term is what makes it the Meta mark rather than a flat figure-eight.
 * The curve reaches the origin twice, at t = 0 and t = pi, and cos flips sign
 * between them — so the two passes sit at +depth and -depth and one strand
 * cleanly occludes the other. A sin-based depth term would put both crossings at
 * z = 0 and the node would read as a mushy blob.
 *
 * Proportions follow the published mark: roughly 2:1 width to height, lobe
 * centres near a quarter-width either side of a node that sits on the horizontal
 * midline — level with the lobes, not above or below them.
 */

import { Curve, Vector3 } from '@iwsdk/core';

export interface MetaMarkOptions {
  /** Half the overall width. Total width is 2 x this. */
  halfWidth: number;
  /** Overall height; the curve spans -height/2 to +height/2. */
  height: number;
  /** Strand separation at the crossing node. Total gap is 2 x this. */
  depth: number;
}

export class MetaMarkCurve extends Curve<Vector3> {
  private readonly halfWidth: number;
  private readonly height: number;
  private readonly depth: number;

  constructor({ halfWidth, height, depth }: MetaMarkOptions) {
    super();
    this.halfWidth = halfWidth;
    this.height = height;
    this.depth = depth;
  }

  override getPoint(t: number, optionalTarget = new Vector3()): Vector3 {
    const u = t * Math.PI * 2;
    return optionalTarget.set(
      this.halfWidth * Math.sin(u),
      (this.height * Math.sin(2 * u)) / 2,
      this.depth * Math.cos(u),
    );
  }
}
