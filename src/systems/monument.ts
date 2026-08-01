/**
 * Turns the infinity mark on its plinth. Slow enough to read as a turntable
 * rather than a spin — roughly 80 seconds per revolution at the default speed —
 * which is what makes the iridescent sweep move across the chrome.
 */

import { createSystem, Object3D } from '@iwsdk/core';
import { Monument } from '../components/site-components.js';

export class MonumentSystem extends createSystem({
  monuments: { required: [Monument] },
}) {
  init(): void {
    this.cleanupFuncs.push(
      this.queries.monuments.subscribe(
        'qualify',
        (entity) => {
          const root = entity.object3D;
          if (root == null) {
            return;
          }
          root.userData.infinityLoop = root.getObjectByName('InfinityLoop') ?? null;
        },
        true,
      ),
    );
  }

  update(delta: number): void {
    for (const entity of this.queries.monuments.entities) {
      const loop = entity.object3D?.userData.infinityLoop as
        | Object3D
        | null
        | undefined;
      if (loop == null) {
        continue;
      }
      loop.rotation.y += (entity.getValue(Monument, 'spinSpeed') ?? 0.075) * delta;
    }
  }
}
