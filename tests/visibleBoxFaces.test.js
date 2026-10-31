import assert from 'node:assert/strict';
import { test } from 'node:test';
import { visibleBoxFaces } from '../src/views/scene/visibleBoxFaces.js';

const box = (x0, y0, z0, x1, y1, z1) => ({ x0, y0, z0, x1, y1, z1 });
const faceArea = (face) => (face.u1 - face.u0) * (face.v1 - face.v0);

test('joined boxes omit the two faces inside their shared seam', () => {
  const faces = visibleBoxFaces([box(0, 0, 0, 1, 1, 1), box(1, 0, 0, 2, 1, 1)]);
  assert.equal(faces.filter((face) => face.axis === 'x' && face.plane === 1).length, 0);
  assert.equal(faces.length, 10);
});

test('the larger surface owns a coincident top without flickering overlap', () => {
  const top = box(0, .9, 0, 2, 1, 2);
  const post = box(.2, 0, .2, .4, 1, .4);
  const faces = visibleBoxFaces([top, post]).filter((face) => face.axis === 'y' && face.sign === 1 && face.plane === 1);
  assert.equal(faces.reduce((sum, face) => sum + faceArea(face), 0), 4);
});

test('faces under a raised object are cut while exposed surrounding areas remain', () => {
  const table = box(0, .7, 0, 2, .8, 2);
  const monitor = box(.5, .8, .5, 1.5, 1.2, 1.5);
  const faces = visibleBoxFaces([table], [table, monitor]);
  const tabletop = faces.filter((face) => face.axis === 'y' && face.sign === 1 && face.plane === .8);
  assert.equal(tabletop.reduce((sum, face) => sum + faceArea(face), 0), 3);
});
