/**
 * Drives the firepit: flickers the PointLight the pit entity carries and
 * breathes the flame cones.
 *
 * LightSystem re-reads its light components every frame, so writing
 * `intensity` back onto PointLightComponent is enough to move the real light.
 */

import { createSystem, Object3D, PointLightComponent } from '@iwsdk/core';
import { FirePit } from '../components/site-components.js';

export class FirePitSystem extends createSystem({
  pits: { required: [FirePit, PointLightComponent] },
}) {
  init(): void {
    this.cleanupFuncs.push(
      this.queries.pits.subscribe(
        'qualify',
        (entity) => {
          const root = entity.object3D;
          if (root == null) {
            return;
          }
          // The scene carries FirePit on a child light node so the light sits at
          // flame height, so walk up until an ancestor owns the flame group.
          let search: Object3D | null = root;
          for (let depth = 0; search != null && depth < 4; depth += 1) {
            const found = search.getObjectByName('FlameGroup');
            if (found != null) {
              root.userData.flameGroup = found;
              return;
            }
            search = search.parent;
          }
          root.userData.flameGroup = null;
        },
        true,
      ),
    );
  }

  update(_delta: number, time: number): void {
    for (const entity of this.queries.pits.entities) {
      const root = entity.object3D;
      if (root == null) {
        continue;
      }

      const base = entity.getValue(FirePit, 'baseIntensity') ?? 34;
      const amount = entity.getValue(FirePit, 'flickerAmount') ?? 0.3;
      const speed = entity.getValue(FirePit, 'flickerSpeed') ?? 5.5;

      // Two incommensurate sines read as irregular firelight without noise.
      const t = time * speed;
      const flicker = Math.sin(t) * 0.6 + Math.sin(t * 1.73 + 1.1) * 0.4;

      entity.setValue(
        PointLightComponent,
        'intensity',
        Math.max(base * (1 + flicker * amount), 0),
      );

      const flames = root.userData.flameGroup as Object3D | null | undefined;
      if (flames == null) {
        continue;
      }
      flames.scale.set(1 + flicker * 0.06, 1 + flicker * 0.17, 1 + flicker * 0.06);
      flames.rotation.y = Math.sin(time * 0.7) * 0.28;
    }
  }
}
