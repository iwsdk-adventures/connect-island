/**
 * PBR texture sets from the Drawcall Market install under `public/texture/`.
 *
 * Textures are loaded once at module scope and shared by every material. A
 * Texture carries its own `repeat`, so a map needed at two different world
 * scales is loaded twice rather than mutated.
 *
 * `aoMap` is deliberately skipped: it samples UV channel 1, which none of these
 * procedural geometries generate, so it would read as a black overlay.
 */

import {
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from '@iwsdk/core';

const loader = new TextureLoader();
const textureUrl = (file: string): string =>
  `${import.meta.env.BASE_URL}texture/${file}`;

/** Installed sets are a mix of .png and .webp, so the extension is per-set. */
const EXT: Record<string, string> = { 'grass-02': 'webp' };
const extFor = (name: string): string => EXT[name] ?? 'png';

function load(file: string, repeat: number, srgb: boolean): Texture {
  const texture = loader.load(textureUrl(file));
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  if (srgb) {
    texture.colorSpace = SRGBColorSpace;
  }
  return texture;
}

export interface PbrMaps {
  map: Texture;
  normalMap: Texture;
  roughnessMap: Texture;
  metalnessMap?: Texture;
}

/** Build the map set for one installed texture at a given world tiling. */
export function pbrMaps(
  name: string,
  repeat: number,
  withMetalness = false,
): PbrMaps {
  const maps: PbrMaps = {
    map: load(`${name}_baseColor.${extFor(name)}`, repeat, true),
    normalMap: load(`${name}_normal.${extFor(name)}`, repeat, false),
    roughnessMap: load(`${name}_roughness.${extFor(name)}`, repeat, false),
  };
  if (withMetalness) {
    maps.metalnessMap = load(`${name}_metallic.${extFor(name)}`, repeat, false);
  }
  return maps;
}

/**
 * Non-square tiling, for surfaces whose UV rectangle is not square.
 *
 * Plank textures run along U, so a boardwalk needs its U repeat matched to the
 * path width and its V repeat to the length — otherwise the boards stretch.
 */
export function pbrMapsXY(
  name: string,
  repeatX: number,
  repeatY: number,
  withMetalness = false,
): PbrMaps {
  const build = (file: string, srgb: boolean): Texture => {
    const texture = loader.load(textureUrl(file));
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    if (srgb) {
      texture.colorSpace = SRGBColorSpace;
    }
    return texture;
  };
  const maps: PbrMaps = {
    map: build(`${name}_baseColor.png`, true),
    normalMap: build(`${name}_normal.png`, false),
    roughnessMap: build(`${name}_roughness.png`, false),
  };
  if (withMetalness) {
    maps.metalnessMap = build(`${name}_metallic.png`, false);
  }
  return maps;
}

/**
 * Relief only — normal and roughness, no base colour.
 *
 * These stylized sets ship muddy olive/tan base colours. On the cream
 * architecture that multiplies the material colour into bronze, so painted
 * surfaces take the surface maps and keep their authored colour.
 */
export function surfaceMaps(
  name: string,
  repeat: number,
): Pick<PbrMaps, 'normalMap' | 'roughnessMap'> {
  return {
    normalMap: load(`${name}_normal.${extFor(name)}`, repeat, false),
    roughnessMap: load(`${name}_roughness.${extFor(name)}`, repeat, false),
  };
}

export const TIMBER = 'wooden-planks-20';
/**
 * Herringbone parquet for the walkways.
 *
 * The pattern is diagonal, so unlike a straight plank it has no grain axis to
 * align — but it does skew if the two repeats do not give square tiles. The
 * walkway repeats are chosen to land on ~3 m tiles in both axes for exactly
 * that reason.
 */
export const BOARDWALK_TIMBER = 'wood-planks-03';
export const GRASS = 'grass-02';
export const CONCRETE_TILES = 'concrete-tiles-02';
export const METAL_PLATES = 'metal-plates-01';
export const GROUND_TILES = 'ground-tiles-with-sand-01';
export const PLASTER = 'plaster-wall-02';
export const DESERT_GROUND = 'desert-ground-01';
