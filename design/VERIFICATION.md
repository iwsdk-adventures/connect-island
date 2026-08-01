# Meta Connect Site — Verification

Evidence gathered against the running app (`iwsdk dev up`, managed browser,
Quest 3 emulation profile) and the editor's file renderer.

## Success criteria

| # | Criterion | Result | Evidence |
| - | --------- | ------ | -------- |
| 1 | Player spawns at the entrance with the monument in frame | PASS | `browser_screenshot` after reload shows the gate pylons, the "Meta Connect 2026" sign, the infinity monument and the pavilion beyond, from the authored entrance pose. |
| 2 | All three corners + pavilion render | PASS | `scene_render_file` (viewId `site-top`) returned `valid: true` with all 54 authored nodes present in `renderStats.visibleNodeIds`. Runtime `scene_get_render_stats` lists every asset id including `pavilion`, `monument`, `firepit`, `stage`. |
| 3 | Info panels render legible text | PASS | `pavilion-view` render shows the Connect 2026 panel fully legible between two columns; `stage-view` shows the stage slide ("NOW ON STAGE / Your first WebXR scene"). |
| 4 | Firepit light varies over time | PASS | Two runtime samples of `firepit-light`: **30.384** and **38.988** candela against an authored base of **34**. Only `FirePitSystem` writes that field. |
| 5 | Console clean; typecheck clean | PASS | `npx tsc --noEmit` silent. Console had only `Missing glyph info for character "\|"`, fixed by replacing the pipe in `connect-info.uikitml`; no errors at any point after the asset manifest was aligned with the scene. |

## Measured cost (runtime, entrance view)

| Metric | Value |
| ------ | ----- |
| Triangles | 184,466 |
| Draw calls | 666 |
| Meshes | 860 |
| Shadow casters | 21 nodes (small furniture excluded) |
| Textures | 41 |

**Draw calls are the number to watch.** 666 is high for a 72–90 fps headset
target. The scene is static, so the cheapest wins if it needs trimming are:

- the 18 bollards (4 meshes each) — collapse to a 2-mesh variant, or drop to one
  pattern per path;
- the 12 tall palms (12 meshes each) — a single merged-mesh palm asset would cut
  ~130 calls on its own;
- the LED strips are separate meshes per run and could be merged per path.

Shadows are enabled from `src/index.ts` (IWSDK leaves `renderer.shadowMap`
off and the project schema exposes no switch). Only the sun casts. Disable those
two lines first if device frame time is short.

## Things found and fixed during verification

1. **Scene referenced removed demo assets.** The starter scene still pointed at
   `environment-desk` etc. after the manifest was rewritten, which made the
   editor fail to initialise and wedged the command bridge. Fixed by authoring
   the new scene; the old one is kept at `design/starter-scene.backup.json`.
2. **`DomeTexture` silently ignored the `.webp` background.** Its `fileTypes` are
   `.png,.jpg,.ktx2,.hdr,.exr` — the market environment's `-background.webp` is
   not among them, so the runtime had `scene.background === null` while the
   editor still looked correct. Both dome and IBL now point at the `.hdr`.
3. **The runtime browser camera comes from `iwsdk.config.json`,** not the scene's
   hero view, so the app opened facing the old starter pose (inside planting).
   The config camera now matches the authored hero view.
4. **Stylized market textures shift colour badly.** `plaster-wall-02`'s base
   colour is olive-brown and turned the cream architecture bronze. Architecture
   and metals now take `surfaceMaps()` (normal + roughness only) and keep their
   authored colour; only ground surfaces use full `pbrMaps()`.
5. **A column stood in front of the Connect panel.** The pavilion was re-bayed
   from 8 to 6 bays so a bay centre — not a column — sits on each of the three
   approach axes.

## Not verified

- **On-device performance.** All measurements are from the desktop emulator
  (Apple M4 Pro). Frame time on a real Quest is unmeasured.
- **XR session behaviour.** The Enter XR button is wired by the existing
  `PanelSystem`, but an immersive session was not driven end to end.
- **Locomotion traversal.** `LocomotionEnvironment` is on the ground asset and
  the feature is enabled, but walking corner-to-corner was not simulated.
