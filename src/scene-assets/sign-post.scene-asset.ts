/**
 * Mounting frame for a free-standing UIKitML sign: a chrome foot, two posts and
 * a timber back panel. The panel is placed just in front of it in scene JSON.
 *
 * Signage that floats unsupported in mid-air is the single most obvious tell
 * that a venue is a mock-up, so every free-standing panel gets one of these.
 *
 * Sized for a 3.15 m x 1.6 m sign; scale the node to fit others.
 */

import { CylinderGeometry, Group, Mesh } from '@iwsdk/core';
import { brushedChrome, graphite, roundedSlabGeometry, timberDark } from './palette.js';

const PANEL_W = 3.3;
const PANEL_H = 1.75;
const PANEL_CENTRE_Y = 2.3;

const signPost = new Group();
signPost.name = 'Sign post';

const footGeometry = new CylinderGeometry(0.26, 0.32, 0.12, 20);
const postGeometry = roundedSlabGeometry(0.14, PANEL_CENTRE_Y + PANEL_H / 2 - 0.1, 0.14, 0.04);

for (const side of [-1, 1]) {
  const x = side * (PANEL_W / 2 - 0.42);

  const foot = new Mesh(footGeometry, brushedChrome);
  foot.position.set(x, 0.06, 0);
  foot.name = `Sign foot ${side < 0 ? 'left' : 'right'}`;
  signPost.add(foot);

  const post = new Mesh(postGeometry, graphite);
  post.position.set(x, (PANEL_CENTRE_Y + PANEL_H / 2 - 0.1) / 2 + 0.12, 0);
  post.name = `Sign post ${side < 0 ? 'left' : 'right'}`;
  signPost.add(post);
}

// Timber backing board the panel sits proud of.
const board = new Mesh(
  roundedSlabGeometry(PANEL_W, PANEL_H, 0.12, 0.09),
  timberDark,
);
board.position.set(0, PANEL_CENTRE_Y, 0);
board.name = 'Sign board';
signPost.add(board);

export default signPost;
