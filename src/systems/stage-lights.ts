/**
 * Sweeps the stage spotlights. Spot lights emit along their node's local -Z, so
 * oscillating the node yaw around its authored value moves the beam across the
 * riser. Each light carries its own phase so the set never moves in lockstep.
 */

import { createSystem, type Entity, SpotLightComponent } from '@iwsdk/core';
import { StageLight } from '../components/site-components.js';
import { mirrorQuery } from './query-list.js';

export class StageLightSystem extends createSystem({
  lights: { required: [StageLight, SpotLightComponent] },
}) {
  private readonly lightList: Entity[] = [];

  init(): void {
    this.cleanupFuncs.push(...mirrorQuery(this.queries.lights, this.lightList));
    this.cleanupFuncs.push(
      this.queries.lights.subscribe(
        'qualify',
        (entity) => {
          const root = entity.object3D;
          if (root == null) {
            return;
          }
          root.userData.baseYaw = root.rotation.y;
        },
        true,
      ),
    );
  }

  update(_delta: number, time: number): void {
    for (let i = 0; i < this.lightList.length; i += 1) {
      const entity = this.lightList[i];
      const root = entity.object3D;
      if (root == null) {
        continue;
      }
      const baseYaw = root.userData.baseYaw as number | undefined;
      if (baseYaw === undefined) {
        continue;
      }

      const speed = entity.getValue(StageLight, 'sweepSpeed') ?? 0.28;
      const range = entity.getValue(StageLight, 'sweepRange') ?? 0.42;
      const phase = entity.getValue(StageLight, 'phase') ?? 0;

      root.rotation.y = baseYaw + Math.sin(time * speed + phase) * range;
    }
  }
}
