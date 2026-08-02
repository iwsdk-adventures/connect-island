/**
 * Drives the firepit: the light it carries, the flame tongues, and the ember
 * swarm rising off them.
 *
 * Three things move on their own clocks, because fire has no single period:
 *
 *  - the PointLight, flickered in intensity AND colour. Intensity alone reads
 *    as a lamp on a dimmer; real firelight also swings warm as it drops.
 *  - each flame tongue, on its own rate and phase from the asset's userData.
 *    Scaling the whole group together made every tongue breathe in lockstep.
 *  - the embers, whose position is a pure function of time and instance index
 *    so the swarm holds no per-particle state and allocates nothing per frame.
 *
 * LightSystem re-reads its light components every frame, so writing back onto
 * PointLightComponent is enough to move the real light.
 */

import {
  Color,
  InstancedMesh,
  Object3D,
  PointLightComponent,
  createSystem,
} from '@iwsdk/core';
import { FirePit } from '../components/site-components.js';

interface FlameData {
  w: number;
  h: number;
  rate: number;
  phase: number;
}

/** How high a spark gets before it burns out. */
const EMBER_RISE = 2.6;
/** Seconds for one spark's full rise. Staggered per index so none coincide. */
const EMBER_PERIOD = 3.4;

/** Deterministic hash to [0,1). Same shape as the vegetation scatter. */
function rand(i: number, salt: number): number {
  const n = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

export class FirePitSystem extends createSystem({
  pits: { required: [FirePit, PointLightComponent] },
}) {
  private scratch!: Object3D;
  private hot!: Color;
  private cool!: Color;
  private tint!: Color;

  init(): void {
    this.scratch = new Object3D();
    // Peak and trough of the flicker. The swing is small in hue and large in
    // value, which is what firelight actually does.
    this.hot = new Color('#ffcb96');
    this.cool = new Color('#ff8b3e');
    this.tint = new Color();

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
            const flames = search.getObjectByName('FlameGroup');
            if (flames != null) {
              root.userData.flameGroup = flames;
              root.userData.emberSwarm = search.getObjectByName('EmberSwarm');
              return;
            }
            search = search.parent;
          }
          root.userData.flameGroup = null;
          root.userData.emberSwarm = null;
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

      // Warmer at the trough, whiter at the peak.
      this.tint.copy(this.cool).lerp(this.hot, flicker * 0.5 + 0.5);
      const colour = entity.getVectorView(PointLightComponent, 'color');
      colour[0] = this.tint.r;
      colour[1] = this.tint.g;
      colour[2] = this.tint.b;

      this.animateFlames(root, time);
      this.animateEmbers(root, time);
    }
  }

  /** Each tongue on its own rate: height swings hardest, width least. */
  private animateFlames(root: Object3D, time: number): void {
    const flames = root.userData.flameGroup as Object3D | null | undefined;
    if (flames == null) {
      return;
    }

    for (const sheet of flames.children) {
      const data = sheet.userData.flame as FlameData | undefined;
      if (data == null) {
        continue;
      }
      const wave = Math.sin(time * data.rate + data.phase);
      const cross = Math.sin(time * data.rate * 0.61 + data.phase * 1.9);
      sheet.scale.set(data.w * (1 + cross * 0.08), data.h * (1 + wave * 0.26), 1);
      // A tongue leans as it rises rather than standing to attention.
      sheet.rotation.z = cross * 0.09;
      sheet.position.x = cross * 0.05;
      sheet.position.z = wave * 0.04;
    }

    flames.rotation.y = Math.sin(time * 0.7) * 0.28;
  }

  /**
   * Sparks rise, drift outward and shrink to nothing, then restart. Each one's
   * whole life is derived from `time` and its index, so there is no state to
   * keep and nothing to allocate.
   */
  private animateEmbers(root: Object3D, time: number): void {
    const swarm = root.userData.emberSwarm as InstancedMesh | null | undefined;
    if (swarm == null) {
      return;
    }

    for (let i = 0; i < swarm.count; i += 1) {
      // Staggered start and a per-spark rate, so they never pulse together.
      const rate = 0.7 + rand(i, 3.3) * 0.7;
      const life = (time / EMBER_PERIOD) * rate + rand(i, 9.1);
      const age = life - Math.floor(life);

      // Sparks leave the bed from within the ring, then spread as they cool.
      const spread = 0.28 + rand(i, 17.5) * 0.5;
      const angle = rand(i, 5.7) * Math.PI * 2 + age * (rand(i, 2.4) - 0.5) * 2.4;
      const radius = spread * (1 + age * 1.5);
      // Slower near the top: the rise eases off as the spark loses its lift.
      const height = EMBER_RISE * (1 - (1 - age) * (1 - age));

      // Fades by shrinking. Cubed so most of the life is spent at full size and
      // the spark winks out rather than deflating.
      const remaining = 1 - age;
      const size = remaining * remaining * remaining * (0.7 + rand(i, 21.3) * 0.8);

      this.scratch.position.set(
        Math.sin(angle) * radius + Math.sin(time * 1.3 + i) * 0.06,
        height,
        Math.cos(angle) * radius + Math.cos(time * 1.1 + i) * 0.06,
      );
      this.scratch.scale.setScalar(size);
      this.scratch.updateMatrix();
      swarm.setMatrixAt(i, this.scratch.matrix);
    }

    swarm.instanceMatrix.needsUpdate = true;
  }
}
