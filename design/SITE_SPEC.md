# Meta Connect Site — Spec, Tech Plan & Build Plan

## Pitch

A walkable Meta Connect 2026 grounds at golden hour. Visitors arrive at an
entrance framed by a monumental iridescent infinity mark, walk into a central
open-air pavilion to read about Connect 2026 and the Immersive Web SDK, then
wander to a firepit lounge or a small session stage. Horizon Worlds building
language — rounded cream masses, soft arcs, tropical planting — wearing Connect
2026's deep-blue and iridescent-chrome brand.

## Layout (equilateral triangle, 24 m sides)

Centroid at the origin, circumradius `24/√3 ≈ 13.86 m`.

| Place            | Position (x, y, z) | Notes                                  |
| ---------------- | ------------------ | -------------------------------------- |
| Pavilion         | `(0, 0, 0)`        | Centroid. 12 m across, open sides.      |
| Entrance + statue| `(0, 0, 13.86)`    | South corner. Player spawns behind it.  |
| Firepit lounge   | `(-12, 0, -6.93)`  | Northwest corner.                       |
| Session stage    | `(12, 0, -6.93)`   | Northeast corner.                       |

Player spawn `(0, 1, 18.5)` facing −Z, so the statue is the first thing seen and
the pavilion sits framed beyond it. Ground disc radius 26 m carries
`LocomotionEnvironment`; three 3.5 m-wide paths run centroid → each corner.

## Art direction

| Element        | Treatment                                                        |
| -------------- | ---------------------------------------------------------------- |
| Architecture   | Warm cream `#efe6d8` shells, soft white `#faf6ef` trim, r≥0.3 fillets |
| Brand accent   | Connect deep blue `#0b2a6b` → `#1d4ed8`, magenta/violet `#a855f7` |
| Statue         | Iridescent chrome: metalness 1, roughness ~0.15, `iridescence: 1` |
| Ground         | Sand-cream plaza, warm terracotta paths                          |
| Sky            | Dusk dome: deep blue zenith → warm amber horizon (matches key art)|
| Planting       | Stylized palms + monstera clusters in terracotta planters        |
| Firelight      | Warm point light, animated intensity                             |

## Content (researched, see Sources in close-out)

**Meta Connect 2026** — September 23–24 2026, Menlo Park CA + free global
livestream at meta.com/connect. Sept 23: Mark Zuckerberg keynote. Sept 24:
developer sessions. Themes: AI, AI glasses/wearables, VR, the metaverse.

**IWSDK** — Meta's open-source WebXR framework (`github.com/facebook/immersive-web-sdk`).
Three.js + a high-performance ECS. Ships XR input with controller + hand
tracking; one-hand / two-hand / distance grabbing; teleport, slide and turn
locomotion with comfort options; Havok physics in web workers; spatial audio;
scene understanding (AR plane/mesh detection); HTML-like spatial UI authoring;
emulator and debug tooling; asset optimization. Runs immersively in headsets and
falls back to mouse-and-keyboard on desktop with no extension. AI-native: 32 MCP
tools let coding agents screenshot, drive input, and inspect the ECS.
Start with `npm create @iwsdk@latest`.

## Tech plan — mechanic → IWSDK classification

| Need                     | Class     | IWSDK pieces                                            |
| ------------------------ | --------- | ------------------------------------------------------- |
| Walk the site            | CONFIGURE | `locomotion` feature (already on) + `LocomotionEnvironment` on ground |
| Info panels              | BUILT-IN  | `AssetType.UIKitML` assets placed as scene nodes         |
| Panel XR launch buttons  | BUILT-IN  | existing `PanelSystem` pattern, `RayInteractable`        |
| Dusk sky + ambient light | BUILT-IN  | root `DomeGradient` + `IBLGradient`                      |
| Sun / firelight / stage  | BUILT-IN  | `DirectionalLight`, `PointLight`, `SpotLight` components |
| All geometry             | CUSTOM    | procedural `Object3D` prototypes in `src/scene-assets/`  |
| Fire flicker             | CUSTOM    | `FirePit` component + system driving light + flame scale |
| Stage light sweep        | CUSTOM    | `StageLight` component + system rotating spot targets    |
| Statue shimmer           | CUSTOM    | `Monument` component + system, slow Y rotation           |
| Repeated seating/planting| BUILT-IN  | scene `resources.prefabs` + `radial`/`explicit` patterns |

Risks: triangle at 24 m sides means large ground geometry — keep it a single
low-segment disc. Tube-based statue is the only high-triangle asset; cap
tubular segments. Transparent flame overdraw kept small.

## Build milestones

- **M1** Ground + paths + dusk lighting; player can walk corner to corner.
- **M2** Pavilion mass + statue monument; both read from across the site.
- **M3** Firepit lounge + session stage.
- **M4** UIKitML info panels inside the pavilion.
- **M5** Ambient systems (fire, stage lights, monument).
- **M6** Planting, dressing, hero views, verification pass.

## File plan

```
src/scene-assets/
  ground.scene-asset.ts        plaza disc + three paths
  pavilion.scene-asset.ts      canopy, columns, deck, brand ring
  monument.scene-asset.ts      lemniscate tube + plinth  (entrance)
  entrance-gate.scene-asset.ts arch markers + signage wall
  firepit.scene-asset.ts       bowl + flame cone stack
  seat-pod.scene-asset.ts      rounded lounge seat (prefab unit)
  stage.scene-asset.ts         riser + backdrop shell + truss
  bench.scene-asset.ts         audience bench (prefab unit)
  planter.scene-asset.ts       terracotta pot + palm/monstera
src/systems/
  firepit.ts  stage-lights.ts  monument.ts
src/components/
  site-components.ts           FirePit, StageLight, Monument
public/ui/
  connect-info.uikitml  iwsdk-info.uikitml  welcome.uikitml (kept)
```

## Success criteria (observable)

1. Player spawns at the entrance with the monument in frame, ground under foot.
2. All three corners + pavilion appear in `renderStats.visibleNodeIds`.
3. Both info panels render legible text in the pavilion.
4. Firepit light intensity varies over time (ECS diff across frames).
5. Console clean of errors; `npx tsc --noEmit` clean.
