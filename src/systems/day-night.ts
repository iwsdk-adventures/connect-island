/**
 * Day-night cycle.
 *
 * Follows the approach in csvr2's DayNightSystem — keyframes around the clock,
 * lerped every frame into the sky gradient, fog and lights — but this one runs
 * a full night rather than bottoming out at golden hour. The site's LED lines,
 * stage wash and firelight only pay off once the ambient drops far enough for
 * them to be the brightest thing around, so the darkest key here is genuinely
 * dark and lit almost entirely by the venue's own fittings.
 *
 * Both the visible sky and the IBL are gradients so they can be animated
 * together. A fixed HDR capture was tried first and fights a day-night cycle
 * directly: at midnight the materials still receive a sunset, and reflective
 * surfaces show a place that is not there.
 *
 * Colours are authored in LINEAR space because that is what the gradient and
 * light components consume — no sRGB conversion is involved anywhere here.
 */

import { frozenTimeOfDay } from '../debug-time.js';
import {
  brandMagenta,
  brandViolet,
  brandVioletTwoSided,
} from '../scene-assets/palette.js';
import { RIDGE_AERIAL, ridgeMaterials } from '../scene-assets/skyline.scene-asset.js';
import {
  seaFloorMaterial,
  waterMaterial,
} from '../scene-assets/water.scene-asset.js';
import {
  Color,
  DirectionalLight,
  DomeGradient,
  HemisphereLightComponent,
  IBLGradient,
  Types,
  VisibilityState,
  createSystem,
} from '@iwsdk/core';

type Rgb = readonly [number, number, number];

/** Positional constructor, so the keyframe table stays readable as a table. */
const key = (
  t: number,
  skyTop: Rgb,
  skyHorizon: Rgb,
  ground: Rgb,
  sun: Rgb,
  sunIntensity: number,
  hemiSky: Rgb,
  hemiGround: Rgb,
  hemiIntensity: number,
  ibl: number,
  fog: Rgb,
): DayKey => ({
  t,
  skyTop,
  skyHorizon,
  ground,
  sun,
  sunIntensity,
  hemiSky,
  hemiGround,
  hemiIntensity,
  ibl,
  fog,
});

interface DayKey {
  t: number;
  skyTop: Rgb;
  skyHorizon: Rgb;
  ground: Rgb;
  sun: Rgb;
  sunIntensity: number;
  hemiSky: Rgb;
  hemiGround: Rgb;
  hemiIntensity: number;
  ibl: number;
  fog: Rgb;
}

/**
 * One turn of the clock. t = 0 is midnight, 0.5 is noon. The night keys sit
 * deliberately low — around 3% of noon — so the authored lighting carries the
 * scene.
 */
const KEYS: DayKey[] = [
  // Deep night, held either side of midnight so the cycle does not race
  // through it. The floor is low but never zero: the ground plane still has to
  // read, and the venue's own fittings carry it.
  key(0.0, [0.006, 0.011, 0.032], [0.03, 0.05, 0.1], [0.012, 0.014, 0.02],
      [0.3, 0.4, 0.68], 0.1, [0.08, 0.11, 0.24], [0.05, 0.052, 0.062], 0.34, 0.14,
      [0.035, 0.05, 0.1]),
  key(0.08, [0.006, 0.012, 0.034], [0.035, 0.055, 0.11], [0.013, 0.015, 0.022],
      [0.3, 0.4, 0.68], 0.1, [0.08, 0.11, 0.24], [0.05, 0.052, 0.062], 0.34, 0.14,
      [0.038, 0.052, 0.105]),
  key(0.2, [0.03, 0.08, 0.24], [0.5, 0.28, 0.2], [0.05, 0.048, 0.05],
      [1.0, 0.5, 0.28], 0.8, [0.14, 0.2, 0.38], [0.08, 0.07, 0.06], 0.26, 0.34,
      [0.42, 0.32, 0.3]),
  // Mid-morning kept properly blue; interpolating straight from dawn to noon
  // passed through a dead neutral grey.
  key(0.34, [0.1, 0.26, 0.58], [0.64, 0.72, 0.82], [0.27, 0.25, 0.2],
      [1.0, 0.88, 0.72], 2.7, [0.32, 0.44, 0.7], [0.31, 0.27, 0.19], 0.26, 0.4,
      [0.64, 0.7, 0.8]),
  // Noon. Sun, hemisphere and IBL are all pulled well down from the first pass,
  // where the combination clipped sand, paving and the cream walls to white.
  key(0.5, [0.11, 0.3, 0.66], [0.68, 0.78, 0.88], [0.34, 0.31, 0.25],
      [1.0, 0.95, 0.83], 3.1, [0.34, 0.46, 0.7], [0.36, 0.31, 0.22], 0.26, 0.42,
      [0.68, 0.76, 0.86]),
  key(0.66, [0.11, 0.25, 0.52], [0.78, 0.68, 0.58], [0.27, 0.24, 0.17],
      [1.0, 0.82, 0.58], 2.8, [0.32, 0.4, 0.6], [0.32, 0.27, 0.17], 0.27, 0.4,
      [0.76, 0.66, 0.56]),
  key(0.78, [0.07, 0.16, 0.4], [0.8, 0.42, 0.2], [0.13, 0.11, 0.09],
      [1.0, 0.6, 0.32], 1.35, [0.2, 0.24, 0.44], [0.14, 0.11, 0.08], 0.28, 0.4,
      [0.6, 0.42, 0.32]),
  key(0.83, [0.045, 0.1, 0.28], [0.6, 0.3, 0.2], [0.07, 0.06, 0.055],
      [0.95, 0.5, 0.3], 0.8, [0.15, 0.17, 0.34], [0.09, 0.07, 0.06], 0.26, 0.3,
      [0.42, 0.26, 0.24]),
  key(0.86, [0.02, 0.05, 0.15], [0.26, 0.16, 0.18], [0.03, 0.03, 0.04],
      [0.7, 0.42, 0.4], 0.4, [0.1, 0.12, 0.24], [0.05, 0.045, 0.05], 0.22, 0.2,
      [0.18, 0.14, 0.17]),
  key(0.93, [0.008, 0.015, 0.04], [0.05, 0.06, 0.12], [0.014, 0.016, 0.024],
      [0.35, 0.42, 0.68], 0.14, [0.09, 0.12, 0.25], [0.052, 0.054, 0.064], 0.34, 0.15,
      [0.05, 0.06, 0.12]),
  key(1.0, [0.006, 0.011, 0.032], [0.03, 0.05, 0.1], [0.012, 0.014, 0.02],
      [0.3, 0.4, 0.68], 0.1, [0.08, 0.11, 0.24], [0.05, 0.052, 0.062], 0.34, 0.14,
      [0.035, 0.05, 0.1]),
];

// Must stay inside the light's shadow-camera far plane (130). At 90 with a far
// of 70 the whole scene sat behind the shadow frustum and nothing cast at all.
const SUN_DISTANCE = 55;
/** Half-width of the sun's shadow frustum. The venue's outer radius is 22.7. */
const SHADOW_EXTENT = 25;
const MAX_ELEVATION = (72 * Math.PI) / 180;

export class DayNightSystem extends createSystem(
  {
    domes: { required: [DomeGradient] },
    hemis: { required: [HemisphereLightComponent] },
    ibls: { required: [IBLGradient] },
  },
  {
    /** Seconds for one full cycle in an immersive session. */
    dayLength: { type: Types.Float32, default: 300 },
    /** Faster clock for the 2D landing flight, so a visitor sees the range. */
    browserDayLength: { type: Types.Float32, default: 110 },
    paused: { type: Types.Boolean, default: false },
    /** Start just before golden hour, when the venue looks its best. */
    timeOfDay: { type: Types.Float32, default: 0.72 },
  },
) {
  private t = 0.72;
  private readonly blend: {
    skyTop: Float32Array;
    skyHorizon: Float32Array;
    ground: Float32Array;
    sun: Float32Array;
    hemiSky: Float32Array;
    hemiGround: Float32Array;
    fog: Float32Array;
  } = {
    skyTop: new Float32Array(3),
    skyHorizon: new Float32Array(3),
    ground: new Float32Array(3),
    sun: new Float32Array(3),
    hemiSky: new Float32Array(3),
    hemiGround: new Float32Array(3),
    fog: new Float32Array(3),
  };
  private fogColor!: Color;
  private sun!: DirectionalLight;
  private sunIntensity = 0;
  private hemiIntensity = 0;
  private iblIntensity = 0;
  private frozen = false;

  init(): void {
    this.t = this.config.timeOfDay.peek();
    this.fogColor = new Color();

    // The key light is owned here rather than authored as a DirectionalLight
    // component. IWSDK's light binding writes the Three light's matrixWorld
    // directly and parks the shadow target from the node's quaternion, and the
    // shadow map it allocated never produced a single shadow no matter how the
    // node was aimed - a 2048 map rendered every frame and sampled by nothing.
    // Owning the light means position, target and shadow frustum are set the
    // way Three expects them, and it is one object either way.
    this.sun = new DirectionalLight();
    this.sun.name = 'Sun';
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    // Small biases on purpose. At 25 m of half-extent on a 2048 map a texel is
    // ~24 mm, and a 28 mm normal bias was pushing the sample far enough off the
    // surface to erase every contact shadow - furniture read as hovering even
    // though the long shadows behind it were landing correctly.
    this.sun.shadow.bias = -0.00018;
    this.sun.shadow.normalBias = 0.012;
    const shadowCamera = this.sun.shadow.camera;
    shadowCamera.near = 1;
    shadowCamera.far = SUN_DISTANCE * 2.4;
    // Framed on the venue, not the whole island: the rounded triangle reaches
    // 22.7 m, and every metre of slack past that costs shadow-map resolution.
    shadowCamera.left = -SHADOW_EXTENT;
    shadowCamera.right = SHADOW_EXTENT;
    shadowCamera.top = SHADOW_EXTENT;
    shadowCamera.bottom = -SHADOW_EXTENT;
    shadowCamera.updateProjectionMatrix();
    this.world.scene.add(this.sun);
    // A DirectionalLight aims at its target's world position, so the target has
    // to be in the graph for its matrix to be updated at all.
    this.world.scene.add(this.sun.target);
    this.cleanupFuncs.push(() => {
      this.sun.removeFromParent();
      this.sun.target.removeFromParent();
      this.sun.dispose();
    });

    // Debug affordance: ?t=0.35 freezes the clock at that point in the cycle so
    // the lighting can be reviewed at a fixed time. Without it the cycle runs.
    const requested = frozenTimeOfDay();
    if (requested !== null) {
      this.t = ((requested % 1) + 1) % 1;
      this.frozen = true;
    }
  }

  update(delta: number): void {
    if (this.frozen) {
      this.sample(this.t);
      this.applySky();
      this.applyLights();
      return;
    }

    if (!this.config.paused.peek()) {
      // The landing flight runs a faster clock than an immersive session.
      const immersive =
        this.world.visibilityState.peek() !== VisibilityState.NonImmersive;
      const length = immersive
        ? this.config.dayLength.peek()
        : this.config.browserDayLength.peek();
      this.t = (this.t + delta / Math.max(length, 1)) % 1;
    } else {
      this.t = this.config.timeOfDay.peek();
    }

    this.sample(this.t);
    this.applySky();
    this.applyLights();
  }

  /** Lerp the surrounding keyframes into the reusable blend buffers. */
  private sample(t: number): void {
    let next = 1;
    while (next < KEYS.length - 1 && KEYS[next].t < t) {
      next += 1;
    }
    const a = KEYS[next - 1];
    const b = KEYS[next];
    const span = b.t - a.t;
    const k = span <= 0 ? 0 : (t - a.t) / span;
    // Smoothstep so the transitions ease rather than ramp linearly.
    const e = k * k * (3 - 2 * k);

    const mixInto = (out: Float32Array, from: Rgb, to: Rgb): void => {
      out[0] = from[0] + (to[0] - from[0]) * e;
      out[1] = from[1] + (to[1] - from[1]) * e;
      out[2] = from[2] + (to[2] - from[2]) * e;
    };

    mixInto(this.blend.skyTop, a.skyTop, b.skyTop);
    mixInto(this.blend.skyHorizon, a.skyHorizon, b.skyHorizon);
    mixInto(this.blend.ground, a.ground, b.ground);
    mixInto(this.blend.sun, a.sun, b.sun);
    mixInto(this.blend.hemiSky, a.hemiSky, b.hemiSky);
    mixInto(this.blend.hemiGround, a.hemiGround, b.hemiGround);
    mixInto(this.blend.fog, a.fog, b.fog);

    this.sunIntensity = a.sunIntensity + (b.sunIntensity - a.sunIntensity) * e;
    this.hemiIntensity = a.hemiIntensity + (b.hemiIntensity - a.hemiIntensity) * e;
    this.iblIntensity = a.ibl + (b.ibl - a.ibl) * e;
  }

  private applySky(): void {
    for (const entity of this.queries.domes.entities) {
      const sky = entity.getVectorView(DomeGradient, 'sky');
      const equator = entity.getVectorView(DomeGradient, 'equator');
      const ground = entity.getVectorView(DomeGradient, 'ground');
      sky.set(this.blend.skyTop, 0);
      equator.set(this.blend.skyHorizon, 0);
      ground.set(this.blend.ground, 0);
      // Environment props are ignored unless the dirty flag is raised.
      entity.setValue(DomeGradient, '_needsUpdate', true);
    }

    const fog = this.world.scene.fog;
    if (fog != null) {
      // The ridges sit a few degrees above the horizon, where the dome has
      // already darkened toward the zenith. Fogging them to the pure horizon
      // colour left them glowing against the sky just above them, so the fog
      // is mixed back toward the zenith by the same amount.
      const horizonShare = 0.2 + Math.min(this.iblIntensity, 1) * 0.42;
      const zenithShare = 1 - horizonShare;
      this.fogColor.setRGB(
        this.blend.fog[0] * horizonShare + this.blend.skyTop[0] * zenithShare,
        this.blend.fog[1] * horizonShare + this.blend.skyTop[1] * zenithShare,
        this.blend.fog[2] * horizonShare + this.blend.skyTop[2] * zenithShare,
      );
      fog.color.copy(this.fogColor);
    }

    // The IBL is a gradient, not a fixed capture, so the light the materials
    // receive tracks the sky instead of contradicting it after sunset.
    this.applyBackdrop();

    for (const entity of this.queries.ibls.entities) {
      entity.getVectorView(IBLGradient, 'sky').set(this.blend.skyTop, 0);
      entity.getVectorView(IBLGradient, 'equator').set(this.blend.skyHorizon, 0);
      entity.getVectorView(IBLGradient, 'ground').set(this.blend.ground, 0);
      entity.setValue(IBLGradient, 'intensity', this.iblIntensity * 2.2);
      entity.setValue(IBLGradient, '_needsUpdate', true);
    }
  }

  /**
   * Tint the unlit backdrop.
   *
   * The ridges and the sea are MeshBasicMaterial, so no light reaches them. Left
   * alone they hold one value all cycle: the ridges end up brighter than the
   * night sky and invisible against the noon sky, and the sea reads as a neon
   * band at midnight. Blending each toward the horizon colour keeps them in the
   * same world as everything else, and keeps the ridges a touch darker than the
   * sky behind them so the silhouette never inverts.
   */
  private applyBackdrop(): void {
    const hr = this.blend.skyHorizon[0];
    const hg = this.blend.skyHorizon[1];
    const hb = this.blend.skyHorizon[2];

    // A ridge must be darker than whatever sky it is silhouetted against — and
    // that is not the same band all day. In daylight it sits against the bright
    // horizon; at night the horizon band is much brighter than the zenith just
    // above it, so blending toward the horizon leaves the far range glowing.
    // Blend the reference from horizon (day) to zenith (night) instead.
    const day = Math.min(Math.max(this.iblIntensity, 0), 1);
    const rr = this.blend.skyTop[0] + (hr - this.blend.skyTop[0]) * day;
    const rg = this.blend.skyTop[1] + (hg - this.blend.skyTop[1]) * day;
    const rb = this.blend.skyTop[2] + (hb - this.blend.skyTop[2]) * day;

    for (let i = 0; i < ridgeMaterials.length; i += 1) {
      // Nearer ranges keep a little more of their own mass; every layer stays
      // below its reference so the silhouette never inverts.
      const sink = 0.62 - (RIDGE_AERIAL[i] ?? 0.2) * 0.5;
      ridgeMaterials[i].color.setRGB(rr * sink, rg * sink, rb * sink * 1.08);
    }

    // Sea: deep teal scaled by the day, lifted by a share of the horizon so it
    // takes the sky's colour at sunrise and sunset instead of staying cyan.
    waterMaterial.color.setRGB(
      0.055 * Math.max(day, 0.04) + hr * 0.3,
      0.16 * Math.max(day, 0.04) + hg * 0.28,
      0.21 * Math.max(day, 0.04) + hb * 0.3,
    );
    waterMaterial.envMapIntensity = 0.18 + Math.max(day, 0.04) * 0.34;

    // Architectural lighting follows the sun, the way a real venue's does. The
    // violet fascia was authored at a fixed emissive and became the loudest
    // object in every daylight frame - a saturated band that read as an
    // emissive left at full strength rather than as a lit soffit. Held down at
    // noon and let up after dusk, it recedes by day and carries the venue at
    // night, which is the only time it should be the brightest thing around.
    const dusk = 1 - Math.min(Math.max(this.iblIntensity / 0.5, 0), 1);
    brandViolet.emissiveIntensity = 0.1 + dusk * 0.8;
    brandVioletTwoSided.emissiveIntensity = brandViolet.emissiveIntensity;
    brandMagenta.emissiveIntensity = 0.09 + dusk * 0.75;

    // The floor under the water: the same hue, well down in value, so depth
    // reads as depth rather than as a second surface.
    seaFloorMaterial.color.setRGB(
      0.02 * Math.max(day, 0.05) + hr * 0.06,
      0.07 * Math.max(day, 0.05) + hg * 0.07,
      0.11 * Math.max(day, 0.05) + hb * 0.09,
    );
  }

  private applyLights(): void {
    // Elevation peaks at noon and goes negative overnight; azimuth sweeps once
    // per cycle so shadows travel across the site.
    const elevation = Math.sin((this.t - 0.25) * Math.PI * 2) * MAX_ELEVATION;
    const azimuth = this.t * Math.PI * 2 + Math.PI * 1.1;
    const cosE = Math.cos(elevation);
    const x = cosE * Math.sin(azimuth) * SUN_DISTANCE;
    const y = Math.sin(elevation) * SUN_DISTANCE;
    const z = cosE * Math.cos(azimuth) * SUN_DISTANCE;

    this.sun.position.set(x, Math.max(y, 2), z);
    this.sun.target.position.set(0, 0, 0);
    this.sun.color.setRGB(this.blend.sun[0], this.blend.sun[1], this.blend.sun[2]);
    this.sun.intensity = Math.max(this.sunIntensity, 0);

    for (const entity of this.queries.hemis.entities) {
      entity.getVectorView(HemisphereLightComponent, 'skyColor').set(this.blend.hemiSky, 0);
      entity
        .getVectorView(HemisphereLightComponent, 'groundColor')
        .set(this.blend.hemiGround, 0);
      entity.setValue(HemisphereLightComponent, 'intensity', this.hemiIntensity);
    }
  }
}
