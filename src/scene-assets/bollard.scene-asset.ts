/**
 * Path bollard: a slim chrome-capped post with a timber shaft and a light slot
 * that throws down onto the boardwalk.
 *
 * Kept narrow — the earlier wide graphite block with a yellow rectangle on it
 * read as a bin rather than a light fitting.
 */

import { CylinderGeometry, Group, Mesh } from '@iwsdk/core';
import { brushedChrome, ledWarm, roundedSlabGeometry, timberDark } from './palette.js';

const HEIGHT = 0.86;

const bollard = new Group();
bollard.name = 'Bollard';

const base = new Mesh(new CylinderGeometry(0.1, 0.13, 0.05, 14), brushedChrome);
base.position.y = 0.025;
base.name = 'Bollard base';
bollard.add(base);

const post = new Mesh(roundedSlabGeometry(0.11, HEIGHT, 0.11, 0.03), timberDark);
post.position.y = 0.05 + HEIGHT / 2;
post.name = 'Bollard post';
bollard.add(post);

// Downward-facing slot under the cap.
const slot = new Mesh(roundedSlabGeometry(0.085, 0.03, 0.085, 0.01), ledWarm);
slot.position.y = 0.05 + HEIGHT - 0.06;
slot.name = 'Bollard light slot';
bollard.add(slot);

const cap = new Mesh(new CylinderGeometry(0.085, 0.075, 0.05, 14), brushedChrome);
cap.position.y = 0.05 + HEIGHT + 0.01;
cap.name = 'Bollard cap';
bollard.add(cap);

export default bollard;
