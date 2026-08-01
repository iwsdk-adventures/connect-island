/**
 * Shared palette, materials and geometry helpers for the Meta Connect site.
 *
 * Imported by every scene-asset module. The asset manifest is evaluated once by
 * the app runtime and once by the editor, in separate realms, so this module
 * stays deterministic and side-effect free: constants and pure factories only.
 *
 * Materials are module-level singletons so every placement shares them. Large
 * masses carry PBR maps; small trim and accents stay smooth, which keeps the
 * texture from repeating visibly at small scales.
 */

import {
  DoubleSide,
  ExtrudeGeometry,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Shape,
} from '@iwsdk/core';
import {
  BOARDWALK_TIMBER,
  CONCRETE_TILES,
  DESERT_GROUND,
  GROUND_TILES,
  METAL_PLATES,
  PLASTER,
  TIMBER,
  pbrMaps,
  pbrMapsXY,
  surfaceMaps,
} from './textures.js';
import { flameTexture } from './flame-texture.js';

/** Site geometry, shared by assets, scene composition and systems. */
export const SITE = {
  /** Equilateral triangle, 24 m sides -> circumradius 24/sqrt(3). */
  sideLength: 24,
  cornerRadius: 13.856,
  corners: {
    entrance: [0, 13.856] as const,
    stage: [12, -6.928] as const,
    firepit: [-12, -6.928] as const,
  },
  groundRadius: 28,
  pavilionRoofRadius: 6,
} as const;

/* ---------------------------------------------------------------- architecture */

/** Large architectural masses — plaster over cream. */
export const creamShell = new MeshPhysicalMaterial({
  color: '#d3c8b3',
  roughness: 0.66,
  metalness: 0,
  clearcoat: 0.1,
  clearcoatRoughness: 0.6,
  ...surfaceMaps(PLASTER, 4),
});

/** Trim, fillets and small accents — deliberately smooth. */
export const creamLight = new MeshPhysicalMaterial({
  color: '#e0d8c8',
  roughness: 0.54,
  metalness: 0,
  clearcoat: 0.14,
  clearcoatRoughness: 0.5,
});

export const creamShade = new MeshStandardMaterial({
  color: '#d9ccb8',
  roughness: 0.8,
  metalness: 0,
});

export const creamShellTwoSided = new MeshPhysicalMaterial({
  color: '#d3c8b3',
  roughness: 0.66,
  metalness: 0,
  clearcoat: 0.1,
  clearcoatRoughness: 0.6,
  side: DoubleSide,
  ...surfaceMaps(PLASTER, 3),
});

export const creamLightTwoSided = new MeshPhysicalMaterial({
  color: '#ded6c7',
  roughness: 0.54,
  metalness: 0,
  clearcoat: 0.14,
  clearcoatRoughness: 0.5,
  side: DoubleSide,
  ...surfaceMaps(PLASTER, 6),
});


/* ---------------------------------------------------------------------- wood */

/**
 * Timber decking. Wood is what stops the site reading as an all-plaster model:
 * it carries the warmth against the cool twilight sky and gives every walking
 * surface a real grain direction.
 *
 * Plank textures run along U, so flat boardwalks use pbrMapsXY with the U
 * repeat matched to path width; circular decks take a square repeat and lay
 * their boards across the disc.
 */
export const timberDeck = new MeshStandardMaterial({
  color: '#c8a173',
  roughness: 0.68,
  metalness: 0,
  ...pbrMaps(TIMBER, 4),
});

export const timberDeckWide = new MeshStandardMaterial({
  color: '#c49b6c',
  roughness: 0.68,
  metalness: 0,
  ...pbrMaps(TIMBER, 3.4),
});

/**
 * Walkways use herringbone parquet rather than the decks' straight planks, so
 * the paths read as a laid surface and the decks as decking. Repeats are matched
 * to each run's real dimensions so the tiles stay square and the 45-degree
 * pattern does not skew.
 */

/**
 * One walkway material for every run. Tiling is baked into each geometry's UVs
 * (see tilePlanarUVs in ground.scene-asset.ts) rather than set per material, so
 * runs of different lengths keep an identical, square parquet tile instead of
 * needing a material each.
 */
export const timberBoardwalk = new MeshStandardMaterial({
  color: '#e3cdb2',
  roughness: 0.7,
  metalness: 0,
  ...pbrMapsXY(BOARDWALK_TIMBER, 1, 1),
});

/** Furniture-scale timber. */
export const timberFine = new MeshStandardMaterial({
  color: '#c39a6d',
  roughness: 0.6,
  metalness: 0,
  ...pbrMaps(TIMBER, 1.6),
});

/**
 * Cladding on extruded arc walls.
 *
 * ExtrudeGeometry derives UVs from the shape's own coordinates — which are in
 * metres — rather than normalising to 0..1. A repeat tuned for a normalised
 * surface therefore comes out many times too small here; 0.35 gives boards of
 * roughly half a metre.
 */
export const timberWall = new MeshStandardMaterial({
  color: '#8a6644',
  roughness: 0.64,
  metalness: 0,
  side: DoubleSide,
  ...pbrMaps(TIMBER, 0.35),
});

/** Stained timber for soffits, fascias and cladding. */
export const timberDark = new MeshStandardMaterial({
  color: '#8a6644',
  roughness: 0.64,
  metalness: 0,
  ...pbrMaps(TIMBER, 3),
});

export const timberDarkTwoSided = new MeshStandardMaterial({
  color: '#8a6644',
  roughness: 0.64,
  metalness: 0,
  side: DoubleSide,
  ...pbrMaps(TIMBER, 5),
});

/* ---------------------------------------------------------------------- ground */

export const sandGround = new MeshStandardMaterial({
  color: '#9d9488',
  roughness: 0.62,
  metalness: 0.05,
  ...surfaceMaps(GROUND_TILES, 16),
});

export const pathStone = new MeshStandardMaterial({
  color: '#a89c8c',
  roughness: 0.62,
  metalness: 0.05,
  ...surfaceMaps(CONCRETE_TILES, 20),
});

export const pathAccent = new MeshStandardMaterial({
  color: '#565c6e',
  roughness: 0.46,
  metalness: 0.22,
  ...surfaceMaps(CONCRETE_TILES, 7),
});

/**
 * The island the site sits on. Pale sand rather than lawn: the tiled grass read
 * as a flat green field and fought the architecture, and sand gives the
 * shoreline somewhere believable to meet the water.
 */
export const outerTerrain = new MeshStandardMaterial({
  color: '#b9a886',
  roughness: 0.94,
  metalness: 0,
  ...surfaceMaps(DESERT_GROUND, 44),
});

/** The beach slope down to the waterline; slightly damper and darker. */
export const shoreSand = new MeshStandardMaterial({
  color: '#a89273',
  roughness: 0.88,
  metalness: 0,
  side: DoubleSide,
  ...surfaceMaps(DESERT_GROUND, 26),
});

export const terracotta = new MeshStandardMaterial({
  color: '#c2704a',
  roughness: 0.85,
  metalness: 0,
});

export const terracottaDeep = new MeshStandardMaterial({
  color: '#9c5637',
  roughness: 0.88,
  metalness: 0,
});

export const darkStone = new MeshStandardMaterial({
  color: '#3d362f',
  roughness: 0.85,
  metalness: 0.35,
  ...surfaceMaps(METAL_PLATES, 3),
});

/* ---------------------------------------------------------------------- metals */

/**
 * The mark's finish: brushed silver-blue with a light thin-film sheen.
 *
 * A full mirror (metalness 1, envMapIntensity > 1) reflected the lawn straight
 * onto the lower half of the mark and turned it olive. Backing the metalness off
 * and damping the environment lets the authored blue carry the surface while
 * still catching the sky.
 */
export const iridescentChrome = new MeshPhysicalMaterial({
  color: '#cfe0f2',
  metalness: 0.82,
  roughness: 0.2,
  iridescence: 0.42,
  iridescenceIOR: 1.4,
  iridescenceThicknessRange: [200, 520],
  envMapIntensity: 0.85,
  clearcoat: 0.6,
  clearcoatRoughness: 0.12,
});

export const brushedChrome = new MeshPhysicalMaterial({
  color: '#cfc9c0',
  metalness: 1,
  roughness: 0.34,
  envMapIntensity: 1.25,
  ...surfaceMaps(METAL_PLATES, 2),
});

/** Upholstery. Matte and slightly warm, to break the all-lavender wash. */
export const fabricCushion = new MeshStandardMaterial({
  color: '#c96f4a',
  roughness: 0.96,
  metalness: 0,
});

export const fabricCushionCool = new MeshStandardMaterial({
  color: '#4a5c86',
  roughness: 0.96,
  metalness: 0,
});

/** Dark planter vessels — terracotta reads as garden centre, not venue. */
export const planterShell = new MeshStandardMaterial({
  color: '#3a3d44',
  roughness: 0.72,
  metalness: 0.18,
});

/** Clean metal for cylindrical parts, where a tiled map shows its UV seam. */
export const polishedSteel = new MeshPhysicalMaterial({
  color: '#b9b4ac',
  metalness: 1,
  roughness: 0.28,
  envMapIntensity: 1.3,
});

/** Trussing, fixtures, speaker cabinets. */
export const darkMetal = new MeshStandardMaterial({
  color: '#2b2f36',
  roughness: 0.45,
  metalness: 0.85,
});

export const graphite = new MeshStandardMaterial({
  color: '#1b1e23',
  roughness: 0.6,
  metalness: 0.3,
});

/* ----------------------------------------------------------------------- brand */

export const brandDeepBlue = new MeshStandardMaterial({
  color: '#0b2a6b',
  roughness: 0.42,
  metalness: 0.1,
  emissive: '#0a2154',
  emissiveIntensity: 0.5,
});

export const brandBlueGlow = new MeshStandardMaterial({
  color: '#1d4ed8',
  roughness: 0.3,
  metalness: 0,
  emissive: '#2563eb',
  emissiveIntensity: 1.6,
});

export const brandViolet = new MeshStandardMaterial({
  color: '#7c3aed',
  roughness: 0.38,
  metalness: 0.05,
  emissive: '#7c3aed',
  emissiveIntensity: 0.75,
});

export const brandMagenta = new MeshStandardMaterial({
  color: '#c026d3',
  roughness: 0.4,
  metalness: 0.05,
  emissive: '#c026d3',
  emissiveIntensity: 0.7,
});

export const brandScreenTwoSided = new MeshStandardMaterial({
  color: '#12266b',
  roughness: 0.36,
  metalness: 0.08,
  emissive: '#1b3f9e',
  emissiveIntensity: 0.9,
  side: DoubleSide,
});

export const brandVioletTwoSided = new MeshStandardMaterial({
  color: '#7c3aed',
  roughness: 0.38,
  metalness: 0.05,
  emissive: '#7c3aed',
  emissiveIntensity: 0.75,
  side: DoubleSide,
});

/* ------------------------------------------------------------------------- LED */

/**
 * Linear light fittings. Unlit and tone-mapping-exempt so they hold a flat,
 * saturated glow at dusk instead of being crushed by exposure.
 */
export const ledBlue = new MeshBasicMaterial({
  color: '#7cb2ff',
  toneMapped: false,
});

export const ledCyan = new MeshBasicMaterial({
  color: '#9becff',
  toneMapped: false,
});

export const ledViolet = new MeshBasicMaterial({
  color: '#c69bff',
  toneMapped: false,
});

export const ledWarm = new MeshBasicMaterial({
  color: '#ffd9a8',
  toneMapped: false,
});

/** Glazing between structural bays. */
export const glassPanel = new MeshPhysicalMaterial({
  color: '#cfe3f5',
  roughness: 0.06,
  metalness: 0,
  transparent: true,
  opacity: 0.22,
  side: DoubleSide,
  envMapIntensity: 2,
  clearcoat: 1,
  clearcoatRoughness: 0.04,
});

/** Tinted glazing for screens and wind guards. */
export const glassTinted = new MeshPhysicalMaterial({
  color: '#8fb4d8',
  roughness: 0.08,
  metalness: 0,
  transparent: true,
  opacity: 0.3,
  side: DoubleSide,
  envMapIntensity: 1.8,
});

/* ----------------------------------------------------------------------- fire */

export const emberBed = new MeshStandardMaterial({
  color: '#2a1a12',
  roughness: 1,
  metalness: 0,
  emissive: '#c0390c',
  emissiveIntensity: 0.35,
});

// Soft alpha ramp on crossed quads. Geometry-based flames always show their
// silhouette; an alpha texture has none, which is what sells it.
export const flameMaterial = new MeshBasicMaterial({
  map: flameTexture,
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
  toneMapped: false,
  side: DoubleSide,
});

export const flameCoreMaterial = new MeshBasicMaterial({
  map: flameTexture,
  color: '#fff0c4',
  transparent: true,
  opacity: 0.75,
  depthWrite: false,
  toneMapped: false,
  side: DoubleSide,
});

/* -------------------------------------------------------------------- planting */

export const foliage = new MeshStandardMaterial({
  color: '#3f8f57',
  roughness: 0.78,
  metalness: 0,
  side: DoubleSide,
});

export const foliageDeep = new MeshStandardMaterial({
  color: '#2f6b45',
  roughness: 0.8,
  metalness: 0,
  side: DoubleSide,
});

export const trunk = new MeshStandardMaterial({
  color: '#8a6f52',
  roughness: 0.9,
  metalness: 0,
});

/* ----------------------------------------------------------------- geometry ops */

/**
 * A slab with filleted edges on every axis — the Horizon rounded-mass primitive.
 * Centered on the origin, `depth` runs along local Z.
 */
export function roundedSlabGeometry(
  width: number,
  height: number,
  depth: number,
  cornerRadius = 0.14,
  bevel = 0.05,
): ExtrudeGeometry {
  const halfW = Math.max(width / 2 - bevel, 0.01);
  const halfH = Math.max(height / 2 - bevel, 0.01);
  const r = Math.min(cornerRadius, Math.min(halfW, halfH) * 0.98);
  const shape = new Shape();
  shape.moveTo(-halfW + r, -halfH);
  shape.lineTo(halfW - r, -halfH);
  shape.absarc(halfW - r, -halfH + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(halfW, halfH - r);
  shape.absarc(halfW - r, halfH - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-halfW + r, halfH);
  shape.absarc(-halfW + r, halfH - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-halfW, -halfH + r);
  shape.absarc(-halfW + r, -halfH + r, r, Math.PI, Math.PI * 1.5, false);

  const extrudeDepth = Math.max(depth - bevel * 2, 0.01);
  const geometry = new ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -extrudeDepth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A curved wall with real thickness and closed ends.
 *
 * An open-ended CylinderGeometry is a single surface — seen edge-on it is a
 * zero-thickness sheet, and its cut ends are hollow. Every curved wall, fascia
 * band and screen in the site uses this instead.
 *
 * Angles follow Three's cylinder convention (theta 0 at +Z, increasing toward
 * +X) so it drops in where a CylinderGeometry segment was. The shape is authored
 * at theta - 90 degrees because extruding in XY and standing it up with
 * rotateX(-90) maps the shape's +Y onto world -Z.
 */
export function arcWallGeometry(
  innerRadius: number,
  outerRadius: number,
  height: number,
  thetaStart: number,
  thetaLength: number,
  curveSegments = 36,
): ExtrudeGeometry {
  const a0 = thetaStart - Math.PI / 2;
  const a1 = a0 + thetaLength;

  const shape = new Shape();
  shape.absarc(0, 0, outerRadius, a0, a1, false);
  shape.absarc(0, 0, innerRadius, a1, a0, true);
  shape.closePath();

  const geometry = new ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments,
  });
  // Extrusion runs along +Z; standing the shape up sends it to +Y, spanning
  // 0..height. Recentre so the mesh positions like the cylinder it replaces.
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -height / 2, 0);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A pointed leaf blade in the XY plane, stem at the origin, tip at +Y.
 * Thin extrusion so it reads from both faces with a two-sided material.
 */
export function leafGeometry(length: number, width: number): ExtrudeGeometry {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(width / 2, length * 0.38, 0, length);
  shape.quadraticCurveTo(-width / 2, length * 0.38, 0, 0);
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.014,
    bevelEnabled: false,
    curveSegments: 10,
  });
  geometry.computeVertexNormals();
  return geometry;
}

/** Yaw (radians) that points local -Z at the origin from position (x, z). */
export function facingCenterYaw(x: number, z: number): number {
  return Math.atan2(-x, -z);
}
