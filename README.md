# Connect Island

A Meta Connect 2026 venue you can walk, built with the
[Immersive Web SDK](https://developers.meta.com/horizon/documentation/web/immersive-web-sdk/).
An island site laid out as a triangle — entrance monument, fire pit, and stage
at the corners, information pavilion in the middle — under a full day-night
cycle.

## The site

- **Entrance** — a gate, a wayfinding pylon, and a tall Meta monument on a
  plinth, reached across a bridge over the moat.
- **Pavilion** (center) — a raised plaster deck under a lathed saucer canopy on
  eight columns. Three curved backing walls carry UIKitML info panels about
  Meta Connect, the Immersive Web SDK, and visiting the grounds. The four open
  bays face the three corners, so every approach arrives at a reading station
  rather than at the back of a panel.
- **Fire pit** — a seated ring with an animated flame, the anchor of the site
  after dark.
- **Stage** — a small session stage with a curved LED screen, a truss ring of
  spot fittings, a lectern, and stools.

The 2D landing page plays a cinematic camera sequence over the site — authored
shots that cut rather than fly between each other — until you press **Enter XR**
or **Explore**.

## What's interesting in here

- **Day-night cycle** (`src/systems/day-night.ts`) — keyframes around the clock
  lerped every frame into the sky dome gradient, fog, and lights. Lighting is
  fully analytic (one directional sun + one hemisphere light); the IBL is baked
  once and only its intensity tracks the cycle, because a per-frame PMREM
  convolution was one of the costs that blew the headset budget. The darkest
  key is genuinely dark, so the venue's own LED lines, stage wash, and firelight
  become the brightest things around.
- **Contact shading behind a switch** (`src/render-config.ts`) — `real` shadow
  maps, cheap instanced `blob` shadows, or `none`, so the headset cost of each
  is measurable. Ships on `blob`.
- **Stage screen as an XR cylinder layer** (`src/systems/stage-screen-layer.ts`)
  — the slide renders to an `XRCylinderLayer` so it curves with the screen and
  is composited by the device at its own resolution instead of being resampled
  through the eye buffers. Behind `USE_STAGE_SCREEN_LAYER`, with the flat panel
  as fallback.
- **Zero-allocation update loops** (`src/systems/query-list.ts`) — elics stores
  query membership in a `Set`, so `for (const e of query.entities)` allocated an
  iterator per query per frame. Membership is mirrored into arrays and walked by
  index instead.

## Run it

```sh
npm install
npm run dev
```

Use the Runtime and Editor controls in the managed browser to switch between the
running experience and its authored scene.

## Build log

This site was built end-to-end in one Claude Code session. The full transcript —
every prompt, tool call, and checkpoint render — is committed under
`.claude/journal/` and published at
[iwa.dev/connect-island](https://iwa.dev/connect-island).

```sh
npm run package:hub   # → dist/ + dist/journal/, ready for the hub
```
