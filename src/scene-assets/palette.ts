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
  AdditiveBlending,
  BufferGeometry,
  DoubleSide,
  Mesh,
  Object3D,
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
  ROCK,
  TIMBER,
  pbrMaps,
  pbrMapsXY,
  surfaceMaps,
} from './textures.js';
import { flameTexture } from './flame-texture.js';

/**
 * Site geometry, shared by assets, scene composition and systems.
 *
 * The plan is a rounded triangle. Each corner carries a circle of
 * `cornerCircleRadius`, and the edge paths are placed so their OUTER edge is
 * tangent to both circles they run between — which makes the outer silhouette
 * arc, straight, arc, with no concave junction anywhere.
 *
 * That tangency fixes the edge offset: outer edge sits at
 * `inradius + cornerCircleRadius`, so the centreline is pushed out from the
 * corner-to-corner line by `cornerCircleRadius - edgeWidth / 2`.
 */
export const SITE = {
  cornerRadius: 16.5,
  inradius: 8.25,
  cornerCircleRadius: 6.2,
  edgeWidth: 2.8,
  bridgeWidth: 2.9,
  corners: {
    entrance: [0, 16.5] as const,
    stage: [14.289, -8.25] as const,
    firepit: [-14.289, -8.25] as const,
  },
  /** Raised platform the pavilion stands on, ringed by the moat. */
  islandRadius: 7.2,
  /** Outer lip of the moat. Deliberately lands under the edge paths. */
  moatOuterRadius: 13.0,
  deckTop: 0.06,
  deckThickness: 0.3,
  moatWaterY: -0.5,
  moatBedY: -1.15,
  groundRadius: 46,
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

/** Moat bed and revetment. */
export const moatRock = new MeshStandardMaterial({
  // Warm and mid-toned, not grey. This is only ever seen THROUGH water: a cool
  // grey bed read back through a blue surface as flat slate, and a very dark one
  // turned the moat into a hole. A sandy rock under a blue surface is what makes
  // shallow water look shallow.
  color: '#96866b',
  roughness: 0.92,
  metalness: 0,
  ...pbrMaps(ROCK, 7),
});

export const moatRockWall = new MeshStandardMaterial({
  color: '#7b7161',
  roughness: 0.9,
  metalness: 0,
  side: DoubleSide,
  ...pbrMaps(ROCK, 4),
});

/** Structural underside of decks and bridges, seen across the moat. */
export const deckStructure = new MeshStandardMaterial({
  color: '#5d5a55',
  roughness: 0.78,
  metalness: 0.12,
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
//
// Tinted and additive. Untinted, the texture's white RGB came through as a pale
// plume that read as steam rather than fire, and alpha blending let the sheets
// flatten each other instead of stacking. Additive means overlapping tongues
// build toward the white-hot centre on their own, which is the whole reason
// there is more than one of them.
export const flameMaterial = new MeshBasicMaterial({
  map: flameTexture,
  color: '#ff6410',
  transparent: true,
  opacity: 0.95,
  blending: AdditiveBlending,
  depthWrite: false,
  toneMapped: false,
  side: DoubleSide,
});

export const flameCoreMaterial = new MeshBasicMaterial({
  map: flameTexture,
  color: '#ffcf72',
  transparent: true,
  opacity: 0.85,
  blending: AdditiveBlending,
  depthWrite: false,
  toneMapped: false,
  side: DoubleSide,
});

/**
 * Rising sparks. Additive and un-fogged: an ember is light, not a lit surface,
 * so it should brighten whatever it drifts across rather than be shaded by it.
 * depthWrite off keeps sparks from punching holes in the flame behind them.
 */
export const emberSpark = new MeshBasicMaterial({
  color: '#ff9a3c',
  transparent: true,
  opacity: 0.95,
  blending: AdditiveBlending,
  depthWrite: false,
  toneMapped: false,
  fog: false,
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
 * Give a non-indexed geometry a trivial sequential index.
 *
 * ExtrudeGeometry emits non-indexed geometry; every primitive constructor
 * (Box, Cylinder, Ring, Torus, Circle, Plane, Tube) emits indexed geometry.
 * LocomotionEnvironment merges everything under its node with
 * BufferGeometryUtils.mergeGeometries, which refuses a batch whose members
 * disagree about the index - so a single extruded wall inside a group silently
 * cost that whole node its collision, logging only to the console.
 *
 * This does not weld vertices; it just makes the two kinds mergeable. Welding
 * would need BufferGeometryUtils.mergeVertices and would change the normals
 * that were computed for the extrusion.
 */
function withIndex<T extends BufferGeometry>(geometry: T): T {
  if (geometry.getIndex() !== null) {
    return geometry;
  }
  const count = geometry.attributes.position.count;
  const index = new Array<number>(count);
  for (let i = 0; i < count; i += 1) {
    index[i] = i;
  }
  // A plain array: setIndex picks the right typed array for the vertex count.
  geometry.setIndex(index);
  return geometry;
}

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
  // The bevel has to fit inside the slab. Asking for a 5 cm bevel on an 11 cm
  // post drove the shape's half-width to the 1 cm floor and then swept a bevel
  // 2.5x wider than the shape itself: the extrusion self-intersected and came
  // out as a spray of shards. Every small fitting in the project - bollard
  // posts, light slots - was built that way. Clamp against the smallest span.
  const fitted = Math.max(
    Math.min(bevel, Math.min(width, height, depth) * 0.22),
    0,
  );
  const halfW = Math.max(width / 2 - fitted, 0.005);
  const halfH = Math.max(height / 2 - fitted, 0.005);
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

  const extrudeDepth = Math.max(depth - fitted * 2, 0.005);
  const geometry = new ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: fitted > 0.0005,
    bevelSize: fitted,
    bevelThickness: fitted,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -extrudeDepth / 2);
  geometry.computeVertexNormals();
  return withIndex(geometry);
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
  return withIndex(geometry);
}

/**
 * A pointed leaf blade in the XY plane, stem at the origin, tip at +Y.
 * Thin extrusion so it reads from both faces with a two-sided material.
 */
export function leafGeometry(
  length: number,
  width: number,
  curveSegments = 10,
): ExtrudeGeometry {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(width / 2, length * 0.38, 0, length);
  shape.quadraticCurveTo(-width / 2, length * 0.38, 0, 0);
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.014,
    bevelEnabled: false,
    curveSegments,
  });
  geometry.computeVertexNormals();
  return withIndex(geometry);
}


/* --------------------------------------------------------------------- shadows */

/**
 * Names that must never cast: emissive fittings, flames and glass lenses.
 * An LED strip lying on a deck casting a shadow of itself onto that deck is
 * pure cost, and it reads as dirt rather than as light.
 */
const NON_CASTING = /light|led|lens|flame|ember|glow|screen|slide|panel/i;

/**
 * Below this, in metres, a mesh receives shadows but does not cast one.
 *
 * The shadow map is a second full pass over everything flagged to cast, and on
 * a headset that pass was as expensive as the main render. A bollard cap, a
 * lamp housing or a stool leg contributes a shadow a few pixels across that
 * nobody will ever miss, so only masses big enough to read pay for it.
 */
const MIN_CASTER_SIZE = 0.75;

/**
 * Shadow flags for a solid prop: casts and receives.
 *
 * The renderer's shadow map and the sun's castShadow were both on while every
 * mesh in the project still had Three's defaults - castShadow and receiveShadow
 * both false. The map was rendered every frame and sampled by nothing, which is
 * why the site looked uniformly flat at every hour and why turning shadows off
 * changed nothing at all.
 *
 * Flags belong on the PROTOTYPE. Every placement is a hierarchy clone, so doing
 * it once here covers all of them, and it cannot drift out of sync with the
 * scene the way a post-load traversal would.
 */
export function shadowProp<T extends Object3D>(root: T): T {
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (mesh.isMesh !== true) {
      return;
    }
    mesh.receiveShadow = true;
    if (NON_CASTING.test(mesh.name)) {
      return;
    }
    const geometry = mesh.geometry;
    if (geometry.boundingBox === null) {
      geometry.computeBoundingBox();
    }
    const box = geometry.boundingBox;
    if (box === null) {
      return;
    }
    const span = Math.max(
      (box.max.x - box.min.x) * Math.abs(mesh.scale.x),
      (box.max.y - box.min.y) * Math.abs(mesh.scale.y),
      (box.max.z - box.min.z) * Math.abs(mesh.scale.z),
    );
    mesh.castShadow = span >= MIN_CASTER_SIZE;
  });
  return root;
}

/** Ground and decks: they take shadows, they do not throw them. */
export function shadowReceiver<T extends Object3D>(root: T): T {
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (mesh.isMesh === true) {
      mesh.receiveShadow = true;
    }
  });
  return root;
}

/** Yaw (radians) that points local -Z at the origin from position (x, z). */
export function facingCenterYaw(x: number, z: number): number {
  return Math.atan2(-x, -z);
}
