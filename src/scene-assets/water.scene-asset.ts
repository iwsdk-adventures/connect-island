/**
 * The sea around the island.
 *
 * The shading follows ProjectFlowerbed's WoodlandWaterShader: the voronoi
 * normal map is sampled three times at different scales, each drifting in its
 * own direction, and the three are summed and renormalised. No single sample
 * ever reads as a repeating tile, and the differing drift rates make the
 * interference pattern non-periodic.
 *
 * Two simplifications over the original, both because this surface is a flat
 * horizontal plane rather than arbitrary geometry:
 *
 *  - the tangent-to-world transform is written out directly instead of going
 *    through perturbNormal2Arb, since the plane's tangent frame is world XZ;
 *  - world position is carried on an explicit varying rather than relying on
 *    vWorldPosition, which only exists under particular envmap defines.
 *
 * The fresnel term driving alpha is Flowerbed's: the water is near-transparent
 * looking straight down and opaque at grazing angles, which is what stops it
 * reading as a flat blue sheet.
 */

import { CircleGeometry, Mesh, MeshPhysicalMaterial } from '@iwsdk/core';
import { voronoiNormalMap } from './water-texture.js';

/** Driven by WaterSystem; shared with the compiled shader. */
export const waterUniforms = {
  uWaveTime: { value: 0 },
};

const WATER_NORMAL_CHUNK = /* glsl */ `
  // Three drifting samples at different scales — the sum never tiles visibly.
  vec2 flowA = vec2(-11.3,  4.4) * uWaveTime;
  vec2 flowB = vec2(  6.0, -7.0) * uWaveTime;
  vec2 flowC = vec2( -3.3, -5.1) * uWaveTime;

  vec3 nA = texture2D(normalMap, (vWaterWorldPos.xz + flowA) * 0.045).xyz * 2.0 - 1.0;
  vec3 nB = texture2D(normalMap, (vWaterWorldPos.xz + flowB) * 0.071).xyz * 2.0 - 1.0;
  vec3 nC = texture2D(normalMap, (vWaterWorldPos.xz + flowC) * 0.026).xyz * 2.0 - 1.0;

  vec3 mapN = normalize(nA + nB + nC);

  // Flat, Y-up surface: tangent X maps to world X, tangent Y to world Z.
  normal = normalize(vec3(
    mapN.x * normalScale.x,
    mapN.z,
    mapN.y * normalScale.y
  ));
`;

const WATER_FRESNEL_CHUNK = /* glsl */ `
  #include <lights_fragment_end>

  vec3 fragToCam = normalize( vViewPosition );
  float fresnel = 1.0 - saturate( 2.25 * pow( max( dot( fragToCam, normal ), 0.0 ), 2.0 ) );

  float specLuminance =
    dot( reflectedLight.directSpecular,   vec3( 0.21, 0.72, 0.07 ) ) +
    dot( reflectedLight.indirectSpecular, vec3( 0.21, 0.72, 0.07 ) );

  // Highlights stay fully opaque regardless of the fresnel term.
  diffuseColor.a = clamp( max( fresnel, specLuminance ), 0.28, 1.0 );
`;

/** Exposed so DayNightSystem can tint it with the sky. */
export const waterMaterial = new MeshPhysicalMaterial({
  color: '#2f6f86',
  roughness: 0.2,
  metalness: 0.0,
  transparent: true,
  normalMap: voronoiNormalMap,
  envMapIntensity: 0.75,
  clearcoat: 0.25,
  clearcoatRoughness: 0.16,
});
waterMaterial.normalScale.set(0.55, 0.55);

// Distinct cache key: the injected chunks change the program.
waterMaterial.customProgramCacheKey = () => 'connect-site-water';

waterMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uWaveTime = waterUniforms.uWaveTime;

  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWaterWorldPos;')
    .replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
       vWaterWorldPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;`,
    );

  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
       varying vec3 vWaterWorldPos;
       uniform float uWaveTime;`,
    )
    .replace('#include <normal_fragment_maps>', WATER_NORMAL_CHUNK)
    .replace('#include <lights_fragment_end>', WATER_FRESNEL_CHUNK);
};

const water = new Mesh(new CircleGeometry(880, 96), waterMaterial);
water.rotation.x = -Math.PI / 2;
water.name = 'Water';
water.renderOrder = -1;

export default water;
