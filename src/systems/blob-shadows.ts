/**
 * Blob shadows: the cheap stand-in for a shadow map.
 *
 * A soft dark ellipse under each mass, all of them in ONE instanced draw call.
 * That buys back the entire shadow pass - a second render of every casting mesh
 * - and the per-fragment depth comparison every receiver was paying, at the
 * cost of shadows that no longer move with the sun.
 *
 * Placement is derived from the scene rather than authored, so it cannot drift
 * out of sync with it. Two kinds of source:
 *
 *  - ordinary meshes already flagged castShadow, which palette.ts only sets on
 *    masses big enough to read (see MIN_CASTER_SIZE). Their world bounding box
 *    gives the footprint.
 *  - the palm trunks, which are one InstancedMesh of ~120 trees. A single box
 *    around those would cover the whole island, so the instance matrices are
 *    read individually.
 *
 * Overlapping blobs are merged, because a prop built from a dozen meshes would
 * otherwise stack a dozen ellipses on the same spot and read as a black hole.
 *
 * Built once, when the scene first has content in it. Nothing here runs per
 * frame; the update loop exits immediately after that.
 */

import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  Object3D,
  Vector3,
  createSystem,
} from '@iwsdk/core';
import { SHADOW_MODE } from '../render-config.js';

/** Footprint below which a mesh gets no blob of its own. */
const MIN_FOOTPRINT = 0.7;
/** Blobs whose centres are closer than this fraction of their radii merge. */
const MERGE_FACTOR = 0.75;
/** Hard cap, so a pathological scene cannot blow the instance buffer. */
const MAX_BLOBS = 320;
/** Lifted off the floor by this much, to stay clear of the surface it sits on. */
const LIFT = 0.02;

interface Blob {
  x: number;
  y: number;
  z: number;
  radius: number;
}

/**
 * A disc whose alpha falls off from the centre to the rim, carried in VERTEX
 * COLOUR rather than in a texture.
 *
 * An RGBA DataTexture was tried first and rendered nothing at all - the map's
 * alpha never reached diffuseColor - while the same material without a map drew
 * fine. A four-component colour attribute needs no texture, no sampler and no
 * fetch per fragment, so it is both simpler and cheaper: Three defines
 * USE_COLOR_ALPHA when the attribute has itemSize 4 and multiplies the whole
 * vec4 into diffuseColor, alpha included.
 *
 * Built as a triangle fan: one opaque vertex at the centre, a rim of fully
 * transparent ones, so the edge dissolves instead of showing a hard circle.
 */
function blobGeometry(segments = 20): BufferGeometry {
  // Three rings, not two. A single fan from an opaque centre to a transparent
  // rim is a linear cone, which reads as a soft smudge rather than as contact;
  // an intermediate ring holds most of the darkness in over the inner half and
  // then drops away quickly, which is the shape a real contact shadow has.
  const RINGS: Array<[number, number]> = [
    [0, 1],
    [0.55, 0.82],
    [1, 0],
  ];

  const positions: number[] = [];
  const colors: number[] = [];
  const index: number[] = [];

  for (const [radius, alpha] of RINGS) {
    for (let i = 0; i <= segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      positions.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      colors.push(1, 1, 1, alpha);
    }
  }

  const stride = segments + 1;
  // Centre fan, then a quad band out to the rim.
  for (let i = 0; i < segments; i += 1) {
    index.push(0, stride + i, stride + i + 1);
    const a = stride + i;
    const b = stride * 2 + i;
    index.push(a, b, b + 1, a, b + 1, a + 1);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 4));
  geometry.setIndex(index);
  return geometry;
}

export class BlobShadowSystem extends createSystem({}) {
  private built = false;
  private box!: Box3;
  private centre!: Vector3;
  private size!: Vector3;
  private scratch!: Object3D;
  private matrix!: Matrix4;
  private position!: Vector3;
  private scale!: Vector3;

  init(): void {
    this.box = new Box3();
    this.centre = new Vector3();
    this.size = new Vector3();
    this.scratch = new Object3D();
    this.matrix = new Matrix4();
    this.position = new Vector3();
    this.scale = new Vector3();

    if (SHADOW_MODE !== 'blob') {
      this.built = true;
    }
  }

  update(): void {
    if (this.built) {
      return;
    }
    // Scene content loads asynchronously; wait until there is something to
    // stand under before measuring anything.
    const blobs = this.collect();
    if (blobs.length === 0) {
      return;
    }
    this.built = true;
    this.build(this.merge(blobs));
  }

  /** Every mass in the scene that should read as touching the floor. */
  private collect(): Blob[] {
    const blobs: Blob[] = [];

    this.world.scene.traverse((node) => {
      const mesh = node as Mesh & { isInstancedMesh?: boolean };
      if (mesh.isMesh !== true) {
        return;
      }

      if (mesh.isInstancedMesh === true) {
        // Only the trunks: fronds, shrubs and grass are canopy, not mass.
        if (mesh.name !== 'Palm trunks') {
          return;
        }
        const instanced = mesh as unknown as InstancedMesh;
        for (let i = 0; i < instanced.count; i += 1) {
          instanced.getMatrixAt(i, this.matrix);
          this.matrix.premultiply(mesh.matrixWorld);
          this.position.setFromMatrixPosition(this.matrix);
          this.matrix.decompose(this.position, this.scratch.quaternion, this.scale);
          blobs.push({
            x: this.position.x,
            // The trunk geometry has its origin at the base, so this is already
            // floor level.
            y: this.position.y,
            z: this.position.z,
            radius: Math.max(this.scale.x, this.scale.z) * 4.5,
          });
        }
        return;
      }

      if (mesh.castShadow !== true) {
        return;
      }
      this.box.setFromObject(mesh);
      if (this.box.isEmpty()) {
        return;
      }
      this.box.getCenter(this.centre);
      this.box.getSize(this.size);
      const footprint = Math.max(this.size.x, this.size.z);
      if (footprint < MIN_FOOTPRINT) {
        return;
      }
      blobs.push({
        x: this.centre.x,
        y: this.box.min.y,
        z: this.centre.z,
        radius: footprint * 0.62,
      });
    });

    return blobs;
  }

  /**
   * Fold overlapping blobs together. A prop built from a dozen meshes would
   * otherwise stack a dozen ellipses in the same place, and alpha blending
   * turns that into a black disc.
   */
  private merge(blobs: Blob[]): Blob[] {
    const merged: Blob[] = [];
    // Biggest first, so a large blob absorbs its own details rather than the
    // other way round.
    for (const blob of blobs.sort((a, b) => b.radius - a.radius)) {
      let absorbed = false;
      for (const kept of merged) {
        const gap = Math.hypot(blob.x - kept.x, blob.z - kept.z);
        if (gap < Math.max(kept.radius, blob.radius) * MERGE_FACTOR) {
          // Grow the survivor just enough to cover what it swallowed.
          kept.radius = Math.max(kept.radius, gap + blob.radius);
          kept.y = Math.min(kept.y, blob.y);
          absorbed = true;
          break;
        }
      }
      if (!absorbed && merged.length < MAX_BLOBS) {
        merged.push({ ...blob });
      }
    }
    return merged;
  }

  private build(blobs: Blob[]): void {
    const material = new MeshBasicMaterial({
      color: new Color('#101a26'),
      vertexColors: true,
      transparent: true,
      opacity: 0.62,
      // Never writes depth: these lie flat on surfaces they must not occlude,
      // and they have to blend with whatever is already drawn there.
      depthWrite: false,
      blending: NormalBlending,
      side: DoubleSide,
      toneMapped: false,
      fog: true,
    });

    const geometry = blobGeometry();

    const mesh = new InstancedMesh(geometry, material, blobs.length);
    mesh.name = 'Blob shadows';
    // Drawn after the opaque floor, before the water.
    mesh.renderOrder = 0;
    mesh.frustumCulled = false;

    blobs.forEach((blob, i) => {
      this.scratch.position.set(blob.x, blob.y + LIFT, blob.z);
      this.scratch.rotation.set(0, 0, 0);
      this.scratch.scale.set(blob.radius, 1, blob.radius);
      this.scratch.updateMatrix();
      mesh.setMatrixAt(i, this.scratch.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;

    this.world.scene.add(mesh);
    this.cleanupFuncs.push(() => {
      mesh.removeFromParent();
      mesh.dispose();
      geometry.dispose();
      material.dispose();
    });
  }
}
