/**
 * Renders the stage's slide onto a WebXR CYLINDER composition layer.
 *
 * The stage screen is a curved arc of the backdrop shell, and until now the
 * slide was a flat UIKitML panel hung in front of it - a chord across an arc,
 * so it only met the screen in the middle and drifted off it toward the edges.
 * A cylinder layer is curved by definition, so it sits on the screen exactly.
 *
 * The bigger win is that a composition layer is handed to the device's own
 * compositor rather than being drawn into the eye buffers. Text on a layer is
 * sampled at the layer's own resolution instead of through the projection
 * layer's, which is what makes small type legible in a headset, and it costs
 * the app's render pass nothing beyond filling the layer's texture.
 *
 * IWSDK's XRLayerSystem is registered by the world initializer already; all
 * this does is create the entity, hand it a render callback, and move the panel
 * into a private scene so the callback has something to draw that is not also
 * being drawn into the main one.
 *
 * Outside XR the same callback feeds a textured cylinder mesh, so the browser
 * view looks the same.
 */

import {
  Box3,
  Color,
  OrthographicCamera,
  Quaternion,
  Vector3,
  XRCylinderLayer,
  createSystem,
} from '@iwsdk/core';
import type { Object3D } from '@iwsdk/core';
import { USE_STAGE_SCREEN_LAYER } from '../render-config.js';

/** Object layer the slide is moved onto: seen only by the layer camera. */
const PANEL_LAYER = 3;

/** Scene node id of the authored slide panel. */
const PANEL_NODE = 'stage-screen';

/* The stage asset's own numbers; the layer has to agree with them. */
const STAGE_POSITION: readonly [number, number, number] = [15.675, 0, -9.05];
const STAGE_YAW_DEG = 120;
const SCREEN_CENTRE_Y = 2.7;
/** Just inside the screen arc's inner face at 5.16, so it reads as the screen. */
const RADIUS = 5.1;
const CENTRAL_ANGLE = 2.3;
const ASPECT = 4;

const ARC_WIDTH = RADIUS * CENTRAL_ANGLE;
const ARC_HEIGHT = ARC_WIDTH / ASPECT;
/** Panel scale that very nearly fills the arc's height (the panel is 9 x 5 m). */
const PANEL_SCALE = 0.55;

export class StageScreenLayerSystem extends createSystem({}) {
  private built = false;
  private screenColor!: Color;
  private layerCamera!: OrthographicCamera;

  init(): void {
    if (!USE_STAGE_SCREEN_LAYER) {
      this.built = true;
      return;
    }

    // Opaque, so the layer clears to the screen's own colour rather than to the
    // transparent clear the layer system sets up.
    this.screenColor = new Color('#0c1c4e');

    this.layerCamera = new OrthographicCamera(
      -ARC_WIDTH / 2,
      ARC_WIDTH / 2,
      ARC_HEIGHT / 2,
      -ARC_HEIGHT / 2,
      0.1,
      20,
    );
    // In FRONT of the panel looking back at it. A UIKitML panel presents its
    // +Z face and is single-sided, so a camera left at the origin looking down
    // -Z sees the back of it and the layer comes out empty.
    this.layerCamera.position.set(0, 0, 5);
    this.layerCamera.lookAt(0, 0, 0);
    // UIKit content can sit on a non-default object layer; the render camera
    // has to be able to see whatever it is on.
    this.layerCamera.layers.enableAll();
  }

  update(): void {
    if (this.built) {
      return;
    }
    const panel = this.world.getSceneObject<Object3D>(PANEL_NODE);
    if (panel == null) {
      return;
    }
    // The node exists before UIKit has built its content into it.
    let meshes = 0;
    panel.traverse((node) => {
      if ((node as { isMesh?: boolean }).isMesh === true) {
        meshes += 1;
      }
    });
    if (meshes === 0) {
      return;
    }
    this.built = true;

    // The panel STAYS under world.scene. Reparenting it into a private scene
    // was the obvious approach and produced a blank layer every time: UIKit
    // keeps laying out and updating its content from the main scene graph, and
    // an object lifted out of it still has its meshes but stops being driven.
    //
    // So instead of moving it, hide it from the main camera and show it to the
    // layer camera, using object layers. The main pass culls it, the layer pass
    // renders nothing else.
    panel.traverse((node) => node.layers.set(PANEL_LAYER));
    this.world.camera.layers.disable(PANEL_LAYER);
    this.layerCamera.layers.set(PANEL_LAYER);

    // Frame it from its real bounds; a panel's origin is not its centre.
    panel.updateWorldMatrix(true, true);
    const bounds = new Box3().setFromObject(panel);
    const size = bounds.getSize(new Vector3());
    const fit =
      size.x > 0 && size.y > 0
        ? Math.min(ARC_WIDTH / size.x, ARC_HEIGHT / size.y) * 0.92
        : PANEL_SCALE;
    this.layerCamera.left = -ARC_WIDTH / 2 / fit;
    this.layerCamera.right = ARC_WIDTH / 2 / fit;
    this.layerCamera.top = ARC_HEIGHT / 2 / fit;
    this.layerCamera.bottom = -ARC_HEIGHT / 2 / fit;
    this.layerCamera.updateProjectionMatrix();

    // Look at the panel from in front of it, along its own +Z.
    const centre = bounds.getCenter(new Vector3());
    const normal = new Vector3(0, 0, 1).applyQuaternion(panel.getWorldQuaternion(new Quaternion()));
    this.layerCamera.position.copy(centre).addScaledVector(normal, 4);
    this.layerCamera.up.copy(new Vector3(0, 1, 0).applyQuaternion(panel.getWorldQuaternion(new Quaternion())));
    this.layerCamera.lookAt(centre);

    const entity = this.world.createTransformEntity();
    const object = entity.object3D;
    if (object != null) {
      object.position.set(STAGE_POSITION[0], SCREEN_CENTRE_Y, STAGE_POSITION[2]);
      // A cylinder layer shows its arc centred on the entity's local -Z, while
      // the stage's screen arc is centred on the stage's local +Z. Hence the
      // half turn on top of the stage's own yaw.
      object.rotation.set(0, ((STAGE_YAW_DEG + 180) * Math.PI) / 180, 0);
    }

    entity.addComponent(XRCylinderLayer, {
      radius: RADIUS,
      centralAngle: CENTRAL_ANGLE,
      aspectRatio: ASPECT,
      pixelWidth: 1024,
      pixelHeight: 256,
      renderCallback: () => {
        // Render the MAIN scene with a camera that can only see the panel. The
        // sky would otherwise clear behind it, so the background is swapped for
        // the screen's own colour and put back.
        const scene = this.world.scene;
        const saved = scene.background;
        scene.background = this.screenColor;
        this.world.renderer.render(scene, this.layerCamera);
        scene.background = saved;
      },
    });

    this.cleanupFuncs.push(() => {
      this.world.camera.layers.enable(PANEL_LAYER);
      panel.traverse((node) => node.layers.set(0));
      entity.destroy();
    });
  }
}
