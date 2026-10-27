/** @file Textures painted on canvases at startup, so the game needs no image files. */

import * as THREE from 'three';

/**
 * Paints a `width` x `height` canvas with `paint` and wraps it as a texture.
 * @param {number} width
 * @param {number} height
 * @param {(context: CanvasRenderingContext2D) => void} paint
 * @param {{ repeat?: boolean }} [options] - Whether the texture tiles across larger surfaces.
 * @returns {THREE.CanvasTexture}
 */
function paintTexture(width, height, paint, { repeat = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function addGrime(context, spots) {
  const { width, height } = context.canvas;
  for (let i = 0; i < spots; i++) {
    context.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.12})`;
    const size = 2 + Math.random() * 10;
    context.fillRect(Math.random() * width, Math.random() * height, size, size * (1 + Math.random() * 4));
  }
}

/** Fills the polygon through `points`, given as flat [x0, y0, x1, y1, ...] pairs. */
function fillPolygon(context, points) {
  context.beginPath();
  context.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) context.lineTo(points[i], points[i + 1]);
  context.closePath();
  context.fill();
}

function fillEllipse(context, centerX, centerY, radiusX, radiusY) {
  context.beginPath();
  context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fill();
}

/** One wall tile's face, floor to ceiling: off-white paint above a dark skirting board, with old grime. */
export const createOfficeWallTexture = () =>
  paintTexture(128, 716, (context) => {
    const { width, height } = context.canvas;
    context.fillStyle = '#cdc6b9';
    context.fillRect(0, 0, width, height);
    for (let streak = 0; streak < 14; streak++) {
      context.fillStyle = `rgba(70, 60, 50, ${0.03 + Math.random() * 0.05})`;
      const x = Math.random() * width, top = Math.random() * height * 0.6;
      context.fillRect(x, top, 2 + Math.random() * 6, height * (0.2 + Math.random() * 0.4));
    }
    context.fillStyle = 'rgba(60, 50, 40, 0.12)';
    context.fillRect(0, height * 0.66, width, 6);
    context.fillStyle = '#3a3632';
    context.fillRect(0, height - 26, width, 26);
    addGrime(context, 160);
  });

/** Two by two large, pale stone tiles with soft veins: 2 m of office floor. */
export const createOfficeFloorTexture = () =>
  paintTexture(512, 512, (context) => {
    const size = context.canvas.width, tile = size / 2;
    context.fillStyle = '#d6d0c4';
    context.fillRect(0, 0, size, size);
    for (let vein = 0; vein < 40; vein++) {
      context.strokeStyle = `rgba(120, 110, 95, ${0.05 + Math.random() * 0.08})`;
      context.lineWidth = 1 + Math.random() * 3;
      const x = Math.random() * size, y = Math.random() * size;
      context.beginPath();
      context.moveTo(x, y);
      context.bezierCurveTo(x + 60 - Math.random() * 120, y + 40, x + 80 - Math.random() * 160, y + 90, x + 120 - Math.random() * 240, y + 140);
      context.stroke();
    }
    context.fillStyle = '#aaa395';
    for (let line = 0; line < size; line += tile) {
      context.fillRect(line, 0, 2, size);
      context.fillRect(0, line, size, 2);
    }
    addGrime(context, 120);
  });

/** Four by four gray stone tiles of slightly different shades: 2 m of terrace, toilet or walkway. */
export const createStoneTileTexture = () =>
  paintTexture(512, 512, (context) => {
    const size = context.canvas.width, tile = size / 4;
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4; column++) {
        const shade = 140 + Math.floor(Math.random() * 30);
        context.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 6})`;
        context.fillRect(column * tile, row * tile, tile, tile);
      }
    }
    addGrime(context, 400);
    context.fillStyle = '#5f6064';
    for (let line = 0; line < size; line += tile) {
      context.fillRect(line, 0, 3, size);
      context.fillRect(0, line, size, 3);
    }
  });

/** Grass-block paving: a concrete lattice with grass growing through staggered diamond holes. */
export const createGardenPavingTexture = () =>
  paintTexture(512, 512, (context) => {
    const size = context.canvas.width, spacing = 32;
    context.fillStyle = '#b6b4a8';
    context.fillRect(0, 0, size, size);
    for (let row = 0; row <= size / spacing; row++) {
      for (let column = -1; column <= size / spacing; column++) {
        const x = column * spacing + (row % 2) * (spacing / 2), y = row * spacing;
        const green = 100 + Math.floor(Math.random() * 30);
        context.fillStyle = `rgb(${green - 30}, ${green}, ${green - 55})`;
        fillPolygon(context, [x, y - 13, x + 11, y, x, y + 13, x - 11, y]);
      }
    }
    addGrime(context, 250);
  });

/** Rough gray concrete for the low walls and the street fence. */
export const createConcreteTexture = () =>
  paintTexture(128, 410, (context) => {
    const { width, height } = context.canvas;
    context.fillStyle = '#7d7a75';
    context.fillRect(0, 0, width, height);
    for (let speck = 0; speck < 900; speck++) {
      const light = Math.random() < 0.5;
      context.fillStyle = light ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.1)';
      context.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    }
    context.fillStyle = '#95928c';
    context.fillRect(0, 0, width, 10);
    addGrime(context, 80);
  });

/** Orange skin with darker ribs, laid out for SphereGeometry's UVs. */
export const createPumpkinTexture = () =>
  paintTexture(
    512,
    256,
    (context) => {
      const { width, height } = context.canvas;
      context.fillStyle = '#c4561a';
      context.fillRect(0, 0, width, height);
      const ribWidth = width / 10;
      for (let x = 0; x < width; x += ribWidth) {
        const gradient = context.createLinearGradient(x, 0, x + ribWidth, 0);
        gradient.addColorStop(0, 'rgba(60, 20, 0, 0.55)');
        gradient.addColorStop(0.5, 'rgba(255, 150, 60, 0.15)');
        gradient.addColorStop(1, 'rgba(60, 20, 0, 0.55)');
        context.fillStyle = gradient;
        context.fillRect(x, 0, ribWidth, height);
      }
    },
    { repeat: false },
  );

/** The glowing carved face, centered where SphereGeometry maps its +z side (u = 0.25). */
export const createPumpkinFaceTexture = () =>
  paintTexture(
    512,
    256,
    (context) => {
      context.fillStyle = '#000';
      context.fillRect(0, 0, context.canvas.width, context.canvas.height);
      context.fillStyle = '#ffd060';
      fillPolygon(context, [96, 108, 120, 108, 110, 80]);
      fillPolygon(context, [136, 108, 160, 108, 146, 80]);
      fillPolygon(context, [122, 128, 134, 128, 128, 114]);
      fillPolygon(context, [92, 140, 164, 140, 154, 160, 142, 150, 128, 162, 114, 150, 102, 160]);
    },
    { repeat: false },
  );

/** A dim old portrait: a pale face with empty eyes. */
export const createPortraitTexture = () =>
  paintTexture(
    128,
    168,
    (context) => {
      const { width, height } = context.canvas;
      const centerX = width / 2;
      const background = context.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, '#2c2419');
      background.addColorStop(1, '#0c0907');
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.fillStyle = '#16110c';
      fillEllipse(context, centerX, height + 10, 56, 62);
      context.fillStyle = '#9c917e';
      fillEllipse(context, centerX, 68, 24, 31);
      context.fillStyle = '#0a0705';
      for (const eyeX of [centerX - 10, centerX + 10]) fillEllipse(context, eyeX, 64, 6, 7);
      context.fillRect(centerX - 8, 84, 16, 2);

      addGrime(context, 120);
    },
    { repeat: false },
  );
