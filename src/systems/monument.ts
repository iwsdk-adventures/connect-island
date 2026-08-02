/**
 * Turns the infinity mark on its plinth. Slow enough to read as a turntable
 * rather than a spin — roughly 80 seconds per revolution at the default speed —
 * which is what makes the iridescent sweep move across the chrome.
 */

import { createSystem, type Entity, Object3D } from '@iwsdk/core';
import { Monument } from '../components/site-components.js';
import { mirrorQuery } from './query-list.js';

export class MonumentSystem extends createSystem({
  monuments: { required: [Monument] },
}) {
  private readonly monumentList: Entity[] = [];

  init(): void {
    this.cleanupFuncs.push(...mirrorQuery(this.queries.monuments, this.monumentList));
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
    for (let i = 0; i < this.monumentList.length; i += 1) {
      const entity = this.monumentList[i];
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
