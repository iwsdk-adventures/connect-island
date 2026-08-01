# Meta Connect Site — Pipeline State

| Phase          | Status  | Artifact                    | Notes                                          |
| -------------- | ------- | --------------------------- | ---------------------------------------------- |
| 0 Preflight    | done    | Capabilities below          |                                                |
| 1 Ideation     | done    | design/SITE_SPEC.md         | 4 axes locked by user + 2 reference images     |
| 2 Design       | skipped | —                           | User supplied reference art; deck not requested |
| 3 Grounding    | done    | design/SITE_SPEC.md §Tech   | Folded into spec — mostly built-ins            |
| 4 Architecture | done    | design/SITE_SPEC.md §Build  | File tree + milestones                         |
| 5 Build        | done    | src/, public/               | See milestone log                              |
| 6 Verify       | done    | design/VERIFICATION.md      | All 5 criteria PASS                            |
| 7 Ship         | done    | `npm run build` clean       | Local build only; not deployed                 |

## Capabilities (Phase 0)

- interactive questions: yes (AskUserQuestion) — one round answered
- sub-agents: not used (user directive: no agent delegation this session)
- node: v26.4.0 · iwsdk CLI 0.5.1 · reference cache ready
- runtime verify: managed browser, port 8081, Quest 3 emulation
- asset marketplaces: Drawcall Market (textures + environments) and Meta's
  asset library both reachable; Drawcall used, Meta library not needed

## Decisions

| Axis          | Choice                                        | Source |
| ------------- | --------------------------------------------- | ------ |
| Scale         | ~24 m triangle sides ("campus")               | user   |
| Mood          | Dusk / golden hour → blue-hour twilight       | user, then revised for brand fit |
| Statue        | Meta infinity monument                        | user   |
| Interactivity | Ambient life + readable panels                | user   |
| Style         | Horizon Worlds forms + Connect 2026 branding  | user images |

## Milestone Log

- **M1** Ground, paths, triangle layout, dusk lighting — top view confirmed the
  plan reads; all 54 nodes in `visibleNodeIds`.
- **M2** Pavilion + infinity monument. Monument is a chrome tube swept along a
  3D lemniscate; reads as the key-art mark from the entrance.
- **M3** Firepit lounge + session stage.
- **M4** Five UIKitML surfaces (Connect, IWSDK, site guide, entrance sign,
  stage schedule) plus a stage screen slide.
- **M5** Ambient systems: firepit flicker, stage light sweep, monument turntable.
- **M6** Visual upgrade pass after user feedback — Drawcall Market PBR textures
  and a twilight HDR environment, LED light lines, glazed pavilion bays,
  triangular stage truss, PA cabinets, wayfinding pylons, path bollards.
- **M7** Verification and correction round — see VERIFICATION.md "found and fixed".

## Retro

- The manifest and the scene must change together. Rewriting `src/assets.ts`
  before authoring the new scene left the old scene pointing at deleted asset
  ids, which killed the editor and the command bridge in one step. Author the
  replacement scene in the same change next time.
- The editor and the runtime disagree more than expected. `DomeTexture` rendered
  fine in editor previews while the runtime had no background at all, because
  the `.webp` was outside its accepted `fileTypes`. Editor renders prove
  composition; only `browser_screenshot` plus `scene_get_render_stats` prove the
  app.
- Marketplace textures are not drop-in. The stylized sets carry strong base
  colours that fight an authored palette; taking only normal + roughness kept the
  surface detail without the colour shift.
