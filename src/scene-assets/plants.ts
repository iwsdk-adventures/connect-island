/**
 * Shared planting builders. Geometries and materials are module-level
 * singletons so every palm and planter in the site shares them; the factories
 * only allocate Object3D wrappers.
 *
 * Pure and deterministic — safe for the dual-realm manifest evaluation.
 */

import {
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Vector2,
} from '@iwsdk/core';
import { darkStone, foliage, foliageDeep, leafGeometry, trunk } from './palette.js';

const vesselMaterial = new MeshStandardMaterial({
  color: '#3a3d44',
  roughness: 0.72,
  metalness: 0.18,
  side: DoubleSide,
});

const potProfile = [
  new Vector2(0.0, 0.0),
  new Vector2(0.42, 0.0),
  new Vector2(0.5, 0.08),
  new Vector2(0.56, 0.32),
  new Vector2(0.54, 0.54),
  new Vector2(0.5, 0.57),
];
const potGeometry = new LatheGeometry(potProfile, 32);
const soilGeometry = new CircleGeometry(0.5, 24);

const frondGeometry = leafGeometry(1.7, 0.52);
const monsteraGeometry = leafGeometry(0.92, 0.8);
const trunkGeometry = new CylinderGeometry(0.075, 0.13, 1, 14);
const stemGeometry = new CylinderGeometry(0.02, 0.028, 1, 8);

/** Terracotta pot with a soil disc, rim at y = 0.57. */
export function createPot(): Group {
  const pot = new Group();
  pot.name = 'Pot';

  const body = new Mesh(potGeometry, vesselMaterial);
  body.name = 'Pot body';
  pot.add(body);

  const soil = new Mesh(soilGeometry, darkStone);
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 0.5;
  soil.name = 'Soil';
  pot.add(soil);

  return pot;
}

/**
 * Palm with a tapered trunk and a drooping frond crown.
 * `height` is trunk length in metres; the crown sits at the top.
 */
export function createPalm(height: number, frondCount = 10): Group {
  const palm = new Group();
  palm.name = 'Palm';

  // Segmented trunk with a slight lean and taper, rather than one straight tube.
  const segments = 4;
  for (let i = 0; i < segments; i += 1) {
    const segHeight = height / segments;
    const seg = new Mesh(trunkGeometry, trunk);
    seg.scale.set(1 - i * 0.11, segHeight, 1 - i * 0.11);
    seg.position.set(
      Math.sin(i * 0.5) * 0.045 * i,
      segHeight * (i + 0.5),
      Math.cos(i * 0.7) * 0.035 * i,
    );
    seg.rotation.z = 0.02 * i;
    seg.name = `Palm trunk ${i}`;
    palm.add(seg);
  }

  const crown = new Group();
  crown.position.y = height;
  crown.name = 'Palm crown';
  palm.add(crown);

  // Each frond is two segments hinged mid-length, so it curves and droops
  // instead of reading as one flat card.
  for (let i = 0; i < frondCount; i += 1) {
    const pivot = new Group();
    pivot.rotation.y = (i / frondCount) * Math.PI * 2 + (i % 2) * 0.21;
    crown.add(pivot);

    const lift = i % 3 === 0 ? 0.16 : i % 3 === 1 ? -0.05 : -0.26;
    const inner = new Mesh(frondGeometry, i % 2 === 0 ? foliage : foliageDeep);
    inner.scale.set(0.62, 0.55, 1);
    inner.rotation.x = -Math.PI / 2 - 0.22 + lift;
    inner.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.1;
    inner.name = `Frond inner ${i}`;
    pivot.add(inner);

    const outer = new Mesh(frondGeometry, i % 2 === 0 ? foliageDeep : foliage);
    outer.scale.set(0.5, 0.6, 1);
    outer.position.set(0, -0.36 + lift * 0.5, -0.86);
    outer.rotation.x = -Math.PI / 2 - 0.78 + lift;
    outer.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.16;
    outer.name = `Frond outer ${i}`;
    pivot.add(outer);
  }

  return palm;
}

/** Low monstera cluster — upright leaves on short stems. */
export function createMonstera(leafCount = 6, scale = 1): Group {
  const cluster = new Group();
  cluster.name = 'Monstera';
  cluster.scale.setScalar(scale);

  for (let i = 0; i < leafCount; i += 1) {
    const pivot = new Group();
    pivot.rotation.y = (i / leafCount) * Math.PI * 2 + 0.3;
    cluster.add(pivot);

    const stemLength = 0.4 + (i % 3) * 0.12;
    const stalk = new Mesh(stemGeometry, foliageDeep);
    stalk.scale.y = stemLength;
    stalk.position.set(0, stemLength / 2, 0);
    stalk.rotation.x = -0.35;
    stalk.position.z = -stemLength * 0.16;
    stalk.name = `Monstera stem ${i}`;
    pivot.add(stalk);

    const leaf = new Mesh(monsteraGeometry, i % 2 === 0 ? foliage : foliageDeep);
    leaf.position.set(0, stemLength * 0.94, -stemLength * 0.33);
    leaf.rotation.x = -Math.PI / 2 + 0.95;
    leaf.name = `Monstera leaf ${i}`;
    pivot.add(leaf);
  }

  return cluster;
}
